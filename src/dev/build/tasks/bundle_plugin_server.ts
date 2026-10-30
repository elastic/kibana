/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import Path from 'path';
import { cpus } from 'os';
import { globby } from 'globby';
import { rspack, type Stats } from '@kbn/rspack-optimizer';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit } from '@kbn/std';
import { getNodeSwcConfig } from '@kbn/swc-config/node';
import type { Task } from '../lib';
import { RELATIVE_REQUIRE_RESOLVE_RE } from './bundle_plugin_server_loader';

const LOADER = require.resolve('./bundle_plugin_server_loader');
// timelion dynamically globs `server/series_functions/*.js` from disk at runtime
const EXCLUDED_PLUGINS = new Set(['@kbn/vis-type-timelion-plugin']);
const CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const CODE_FILE_RE = /\.(?:[jt]sx?|mjs)$/;
const ASSET_FILE_RE = /\.(?:text|ya?ml)$/;
const CROSS_PKG_IMPORT_RE = /(["'])@kbn\/([a-z0-9_-]+)\/([^"'\s]+)\1/g;
// Relative `.js` paths outside of requires are loaded by path at runtime, e.g. workers.
const RUNTIME_PATH_RE = /(?<!require\()(["'])(\.\.?\/[^"'\s]+\.js)\1/g;

const isInside = (dir: string, file: string) => !Path.relative(dir, file).startsWith('..');

/**
 * Bundles a plugin's server code (everything but `public/`) from source into its installed copy,
 * keeping `server/index`, `common` and `entries` addressable for other packages.
 */
export async function bundlePluginServer({
  srcPluginDir,
  distPluginDir,
  entries,
}: {
  srcPluginDir: string;
  distPluginDir: string;
  entries: Iterable<string>;
}): Promise<number> {
  const srcServerDir = Path.join(srcPluginDir, 'server');
  const distServerDir = Path.join(distPluginDir, 'server');
  const inBundle = (file: string) =>
    isInside(srcPluginDir, file) && !isInside(Path.join(srcPluginDir, 'public'), file);
  const toDistFile = (file: string) =>
    Path.join(distPluginDir, Path.relative(srcPluginDir, file))
      .replace(CODE_FILE_RE, '.js')
      .replace(ASSET_FILE_RE, '$&.js');

  // Deep entries are emitted next to the main entry and re-exported by a stub at their own path.
  const rspackEntries: Record<string, string> = {};
  const stubs = new Map<string, string>();
  for (const subpath of ['server/index', 'common', ...entries]) {
    const base = Path.join(srcPluginDir, subpath).replace(CODE_FILE_RE, '');
    const file = [
      ...CODE_EXTS.map((ext) => base + ext),
      ...CODE_EXTS.map((ext) => Path.join(base, `index${ext}`)),
    ].find((f) => Fs.existsSync(f));
    // Like the unbundled build, only modules that shipped as per-file output are addressable.
    if (!file || !inBundle(file) || !Fs.existsSync(toDistFile(file))) {
      continue;
    }
    const logical = Path.relative(srcPluginDir, file).replace(CODE_FILE_RE, '');
    const name =
      logical === 'server/index' ? 'index' : `plugin.entry-${logical.replace(/[^\w-]/g, '_')}`;
    if (rspackEntries[name] && rspackEntries[name] !== file) {
      throw new Error(`Entry name collision for ${name} in ${srcPluginDir}`);
    }
    rspackEntries[name] = file;
    if (name !== 'index') {
      stubs.set(toDistFile(file), Path.join(distServerDir, `${name}.js`));
    }
  }
  if (!rspackEntries.index) {
    return 0;
  }

  const stats = await new Promise<Stats>((resolve, reject) => {
    const compiler = rspack({
      mode: 'production',
      target: 'node',
      context: srcServerDir,
      entry: rspackEntries,
      devtool: 'hidden-nosources-source-map',
      node: { __dirname: false, __filename: false },
      output: {
        path: distServerDir,
        library: { type: 'commonjs2' },
        // A module that threw while loading throws again when required, instead of returning `{}`.
        strictModuleExceptionHandling: true,
        devtoolModuleFilenameTemplate: ({ absoluteResourcePath }) =>
          Path.relative(REPO_ROOT, absoluteResourcePath),
      },
      resolve: { extensions: [...CODE_EXTS, '.json'] },
      externalsType: 'commonjs',
      externals: [
        ({ request, context }, callback) => {
          if (!request || (!request.startsWith('.') && !Path.isAbsolute(request))) {
            return callback(undefined, request);
          }
          const file = Path.resolve(context ?? srcServerDir, request);
          if (!inBundle(file)) {
            return callback(new Error(`${request} in ${context} is outside of ${srcPluginDir}`));
          }
          // JSON is required from the distributable instead of being inlined as JavaScript source.
          return file.endsWith('.json')
            ? callback(undefined, `./${Path.relative(srcServerDir, file)}`)
            : callback();
        },
      ],
      plugins: [
        new rspack.BannerPlugin({
          // Repeats "use strict", since the banner displaces Rspack's own directive.
          banner: '"use strict";const __kbnBundleDirname=__dirname;',
          raw: true,
          entryOnly: false,
        }),
      ],
      module: {
        parser: {
          javascript: {
            dynamicImportMode: 'eager',
            // SWC keeps re-exports of types, which don't exist at runtime.
            exportsPresence: false,
            requireResolve: false,
            requireAsExpression: false,
          },
        },
        // Function conditions, because Jest's RegExp realm differs from Rspack's.
        rules: [
          { test: (path: string) => ASSET_FILE_RE.test(path), type: 'asset/source' },
          ...CODE_EXTS.map((ext) => ({
            test: (path: string) => path.endsWith(ext),
            use: [
              LOADER,
              { loader: 'builtin:swc-loader', options: { jsc: getNodeSwcConfig(`x${ext}`).jsc } },
            ],
          })),
        ],
      },
      optimization: {
        minimize: false,
        // Like unbundled code, read NODE_ENV at runtime instead of inlining `production`.
        nodeEnv: false,
        // The inner graph leaves references in unused code for a minifier to remove, but ours keeps
        // that code and renames functions it would capture, changing their `name`.
        innerGraph: false,
        runtimeChunk: stubs.size ? { name: 'plugin.runtime' } : false,
        splitChunks: { chunks: 'all', minSize: 0, name: 'plugin.chunk-shared' },
      },
    });
    compiler.run((error, result) =>
      compiler.close(() => (error || !result ? reject(error) : resolve(result)))
    );
  });

  // Warnings (e.g. dynamic requires Rspack can't follow) mean the bundle would break at runtime.
  if (stats.hasErrors() || stats.hasWarnings()) {
    const { errors = [], warnings = [] } = stats.toJson({ errors: true, warnings: true });
    const messages = [...errors, ...warnings].map((e) => e.message).join('\n');
    throw new Error(`Rspack failed in ${srcPluginDir}:\n${messages}`);
  }

  // Remove per-file outputs of bundled modules, and of TS sources that can only run via the bundle.
  const bundled = new Set(stats.compilation.fileDependencies);
  const assets = new Set(
    Object.keys(stats.compilation.assets).map((a) => Path.join(distServerDir, a))
  );
  const sources = await globby('**/*.{ts,tsx,js,jsx,mjs,text,yml,yaml}', {
    cwd: srcPluginDir,
    absolute: true,
    ignore: ['public/**', 'target/**', '**/node_modules/**', '**/*.d.ts'],
  });
  const removed = sources
    .filter((file) => bundled.has(file) || /\.tsx?$/.test(file))
    .map(toDistFile)
    .filter((file) => !assets.has(file) && Fs.existsSync(file));
  await Promise.all(removed.map((file) => Fsp.rm(file)));

  for (const [stub, target] of stubs) {
    const rel = Path.relative(Path.dirname(stub), target);
    await Fsp.writeFile(stub, `module.exports = require(${JSON.stringify(`./${rel}`)});\n`);
    // The source map was for the replaced module.
    await Fsp.rm(`${stub}.map`, { force: true });
  }
  return removed.length;
}

/** Maps plugins to the modules that shipped code references by `@kbn/<pkg>/<path>` or by path. */
export async function findEntries(kbnModulesDir: string): Promise<Map<string, Set<string>>> {
  const entries = new Map<string, Set<string>>();
  const add = (pkg: string, subpath: string) => {
    const id = `@kbn/${pkg}`;
    entries.set(id, (entries.get(id) ?? new Set()).add(subpath));
  };
  const files = await globby('**/*.js', {
    cwd: kbnModulesDir,
    // Browser code is at the top of each package, while server code can have `public` routes.
    ignore: [
      '**/node_modules/**',
      '*/{public,shared_built_assets,target_workers,target_vega_sandbox}/**',
    ],
  });
  await asyncForEachWithLimit(files, cpus().length * 2, async (file) => {
    const content = await Fsp.readFile(Path.join(kbnModulesDir, file), 'utf8');
    for (const [, , pkg, subpath] of content.matchAll(CROSS_PKG_IMPORT_RE)) {
      add(pkg, subpath);
    }
    const [pkg, ...rest] = file.split('/');
    for (const re of [RUNTIME_PATH_RE, RELATIVE_REQUIRE_RESOLVE_RE]) {
      for (const [, , ref] of content.matchAll(re)) {
        add(pkg, Path.posix.join(Path.posix.dirname(rest.join('/')), ref));
      }
    }
  });
  return entries;
}

export const BundlePluginServers: Task = {
  description: 'Bundling plugin server code with Rspack',

  async run(config, log, build) {
    const kbnModulesDir = build.resolvePath('node_modules/@kbn');
    const entries = await findEntries(kbnModulesDir);
    const plugins = config
      .getDistPluginsFromRepo()
      .filter((pkg) => !EXCLUDED_PLUGINS.has(pkg.manifest.id));

    let removed = 0;
    await asyncForEachWithLimit(plugins, cpus().length, async (pkg) => {
      const pluginRemoved = await bundlePluginServer({
        srcPluginDir: config.resolveFromRepo(pkg.normalizedRepoRelativeDir),
        distPluginDir: build.resolvePath('node_modules', pkg.manifest.id),
        entries: [
          ...(entries.get(pkg.manifest.id) ?? []),
          // Declared public for browser bundles, and importable by server code too.
          ...(pkg.manifest.plugin.extraPublicDirs ?? []).filter((dir) => dir.startsWith('common/')),
        ],
      });
      removed += pluginRemoved;
    });
    log.info(`Bundled plugin server code, replacing ${removed} per-file outputs`);
  },
};
