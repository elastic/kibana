/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import { cpus } from 'os';
import type { rspack as rspackType } from '@rspack/core';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Package, PluginPackage } from '@kbn/repo-packages';
import { asyncForEachWithLimit } from '@kbn/std';
import type { Task } from '../lib';

const hostModule = process.getBuiltinModule('module') as typeof import('module') & {
  _extensions: Record<string, (mod: { exports: unknown }, filename: string) => void>;
};
const nativeRequire = hostModule.createRequire(__filename);
const rspack: typeof rspackType = nativeRequire('@rspack/core').rspack;
// Obtain host-realm RegExp so `instanceof RegExp` succeeds inside native @rspack/core under Jest VM.
const HostRegExp: typeof RegExp = hostModule.constructor.constructor('return RegExp')();
hostModule._extensions['.ts'] ??= (mod) => {
  mod.exports = kbnServerDirnameLoader;
};

// timelion dynamically globs `server/series_functions/*.js` from disk at runtime
const EXCLUDED_PLUGINS = new Set(['@kbn/timelion-plugin']);
const CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'] as const;
const CODE_FILE_RE = /\.(?:[jt]sx?|mjs)$/;
const EXCLUDED_DIR_NAMES = new Set(['mocks', '__mocks__', 'test', 'tests', '__tests__']);
const EXCLUDED_FILE_RE = /\.(?:test|mock|spec)(?:\.(?:[jt]sx?|mjs))?$/;

const CROSS_PKG_SERVER_IMPORT_RE = /(["'])(@kbn\/([a-z0-9_-]+)\/server\/([^"'\s]+))\1/g;
const INTERNAL_ENTRY_REF_RE =
  /(?:\brequire\.resolve\(\s*(["'])(\.\.?\/[^"']+)\1\s*\)|(["'])(\.\.?\/[^"'\s]+\.worker(?:\.[jt]s)?)\3)/g;
const TYPE_ONLY_IMPORT_EXPORT_RE =
  /\b(?:import|export)\s+type\b[\s\S]*?from\s*["'][^"']+["']|\b(?:import|export)\s*\{\s*(?:type\s+[^,}]+(?:\s*,\s*type\s+[^,}]+)*\s*,?\s*)\}\s*from\s*["'][^"']+["']/g;

const RSPACK_RULES = [
  { test: new HostRegExp('\\.(?:text|ya?ml)$'), loader: __filename },
  ...[
    { test: '\\.ts$', parser: { syntax: 'typescript', tsx: false, decorators: true } },
    { test: '\\.tsx$', parser: { syntax: 'typescript', tsx: true, decorators: true } },
    { test: '\\.(?:jsx?|mjs)$', parser: { syntax: 'ecmascript', jsx: true, decorators: true } },
  ].map(({ test, parser }) => ({
    test: new HostRegExp(test),
    use: [
      __filename,
      {
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            transform: { legacyDecorator: true, decoratorMetadata: true },
            target: 'es2022',
            keepClassNames: true,
            output: { charset: 'ascii' },
            minify: {
              compress: false,
              mangle: false,
              format: { comments: false, asciiOnly: true },
            },
            externalHelpers: true,
            parser,
          },
        },
      },
    ],
  })),
];

/**
 * Rspack loader that preserves per-module `__dirname`/`__filename`, relative `require.resolve`,
 * template-literal `import()`, and 1-byte ASCII output for V8 `SeqOneByteString` heap efficiency.
 */
// eslint-disable-next-line import/no-default-export
export default function kbnServerDirnameLoader(
  this: {
    rootContext: string;
    resourcePath: string;
    callback: (err: null, src: string, map?: unknown) => void;
  },
  source: string,
  map?: unknown
): void {
  if (!CODE_FILE_RE.test(this.resourcePath)) {
    source = `module.exports = ${JSON.stringify(source)};`;
  }
  if (source.includes('import(')) {
    source = source.replace(
      /\bimport\(\s*(`[^`]+`)\s*\)/g,
      'Promise.resolve($1).then(s => ({ default: require(s), ...require(s) }))'
    );
  }
  if (/\brequire\.resolve\(\s*["']\./.test(source)) {
    source = source.replace(
      /\brequire\.resolve\(\s*(["']\.?\.\/[^"']+["'])\s*\)/g,
      'require.resolve(require("path").resolve(__dirname, $1))'
    );
  }
  if (/\b__(?:dirname|filename)\b/.test(source)) {
    const relFile = Path.relative(this.rootContext, this.resourcePath)
      .replace(/\\/g, '/')
      .replace(CODE_FILE_RE, '.js');
    const relDir = Path.posix.dirname(relFile);
    const decls: string[] = [];
    if (relDir !== '.' && /\b__dirname\b/.test(source)) {
      decls.push(
        `const __dirname=require("path").join(__kbnBundleDirname,${JSON.stringify(relDir)});`
      );
    }
    if (/\b__filename\b/.test(source)) {
      decls.push(
        `const __filename=require("path").join(__kbnBundleDirname,${JSON.stringify(relFile)});`
      );
    }
    if (decls.length > 0) {
      source = source.replace(/^("use strict";)?/, `$1${decls.join('')}`);
    }
  }
  if (/[\u0080-\uffff]/.test(source) && !source.includes('String.raw')) {
    source = source.replace(
      /[\u0080-\uffff]/g,
      (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
    );
  }
  this.callback(null, source, map);
}

function isInsideDir(parentDir: string, targetPath: string): boolean {
  const rel = Path.relative(parentDir, targetPath);
  return rel === '' || (!rel.startsWith('..') && !Path.isAbsolute(rel));
}

function relativeSpecifier(fromDir: string, toFile: string): string {
  const rel = Path.relative(fromDir, toFile).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function resolveEntryFile(serverDir: string, subpath: string): string | null {
  const clean = subpath.replace(/^\.\//, '').replace(/\/+$/, '').replace(/\\/g, '/');
  if (EXCLUDED_FILE_RE.test(clean) || clean.split('/').some((p) => EXCLUDED_DIR_NAMES.has(p))) {
    return null;
  }
  const baseAbs = Path.resolve(serverDir, clean);
  if (!isInsideDir(serverDir, baseAbs)) {
    return null;
  }
  const stripped = baseAbs.replace(CODE_FILE_RE, '');
  for (const candidate of [
    baseAbs,
    ...CODE_EXTS.map((ext) => `${stripped}${ext}`),
    ...CODE_EXTS.map((ext) => Path.join(stripped, `index${ext}`)),
  ]) {
    if (
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile() &&
      CODE_FILE_RE.test(candidate)
    ) {
      return candidate;
    }
  }
  return null;
}

async function listFilesRecursive(dir: string, skipExcluded = false): Promise<string[]> {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      if (skipExcluded && EXCLUDED_DIR_NAMES.has(e.name)) {
        return [];
      }
      const full = Path.join(dir, e.name);
      if (e.isDirectory()) {
        return listFilesRecursive(full, skipExcluded);
      }
      return e.isFile() && (!skipExcluded || !EXCLUDED_FILE_RE.test(e.name)) ? [full] : [];
    })
  );
  return nested.flat();
}

/**
 * Returns true if the package is a Kibana plugin whose `server/` directory
 * should be compiled and bundled directly from source by `BundlePluginServers`.
 */
export function shouldBundlePluginServer(pkg: Package): boolean {
  return (
    pkg.isPlugin() &&
    !EXCLUDED_PLUGINS.has(pkg.manifest.id) &&
    resolveEntryFile(Path.join(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'server'), 'plugin') !==
      null
  );
}

export interface BundlePluginServerOptions {
  srcServerDir: string;
  distServerDir?: string;
  additionalEntries?: string[];
  sourceMaps?: boolean;
}

export interface BundlePluginServerResult {
  bundled: boolean;
  sourceFilesCount: number;
  emittedFilesCount: number;
}

/**
 * Compiles and bundles a plugin's `server/` directory directly from `.ts` source
 * into `distServerDir` using Rspack's native Rust `builtin:swc-loader`.
 */
export async function bundlePluginServerDir({
  srcServerDir,
  distServerDir = srcServerDir,
  additionalEntries = [],
  sourceMaps = true,
}: BundlePluginServerOptions): Promise<BundlePluginServerResult> {
  const resolvedSrcDir = Path.resolve(srcServerDir);
  const resolvedDistDir = Path.resolve(distServerDir);
  const pluginEntryPath = resolveEntryFile(resolvedSrcDir, 'plugin');
  if (!pluginEntryPath) {
    return { bundled: false, sourceFilesCount: 0, emittedFilesCount: 0 };
  }

  const indexEntryPath = resolveEntryFile(resolvedSrcDir, 'index');
  const allSrcFiles = (await listFilesRecursive(resolvedSrcDir, true)).filter((f) =>
    CODE_FILE_RE.test(f)
  );
  await fs.promises.mkdir(resolvedDistDir, { recursive: true });

  const entryFileByLogicalName = new Map<string, string>();
  if (indexEntryPath) {
    entryFileByLogicalName.set('index', indexEntryPath);
  }
  entryFileByLogicalName.set('plugin', pluginEntryPath);

  const addSubEntry = (subpath: string, baseDir = resolvedSrcDir) => {
    const resolved = resolveEntryFile(resolvedSrcDir, Path.resolve(baseDir, subpath));
    if (resolved && resolved !== indexEntryPath && resolved !== pluginEntryPath) {
      const logical = Path.relative(resolvedSrcDir, resolved)
        .replace(/\\/g, '/')
        .replace(CODE_FILE_RE, '');
      entryFileByLogicalName.set(logical, resolved);
    }
  };

  for (const subpath of additionalEntries) {
    addSubEntry(subpath);
  }
  await Promise.all(
    allSrcFiles.map(async (srcFile) => {
      const content = await fs.promises.readFile(srcFile, 'utf8');
      for (const match of content.matchAll(INTERNAL_ENTRY_REF_RE)) {
        const ref = match[2] ?? match[4];
        if (ref) {
          addSubEntry(ref, Path.dirname(srcFile));
        }
      }
    })
  );

  const rspackEntries: Record<string, string> = {};
  const subdirStubs = new Map<string, string>();
  for (const [logicalName, absSrcPath] of entryFileByLogicalName) {
    const relSpec = relativeSpecifier(resolvedSrcDir, absSrcPath);
    if (!logicalName.includes('/')) {
      rspackEntries[logicalName] = relSpec;
    } else {
      const flatName = `plugin.entry-${logicalName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      rspackEntries[flatName] = relSpec;
      subdirStubs.set(Path.join(resolvedDistDir, `${logicalName}.js`), flatName);
    }
  }

  const externalRequests = new Set<string>();
  let emittedAssetsCount = 0;
  await new Promise<void>((resolve, reject) => {
    const compiler = rspack({
      mode: 'production',
      target: 'node',
      context: resolvedSrcDir,
      entry: rspackEntries,
      devtool: sourceMaps ? 'nosources-source-map' : false,
      node: { __dirname: false, __filename: false },
      output: {
        path: resolvedDistDir,
        filename: '[name].js',
        chunkFilename: 'plugin.chunk-[id].js',
        library: { type: 'commonjs2' },
        pathinfo: false,
      },
      resolve: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'] },
      externalsType: 'commonjs',
      externals: [
        ({ request, context, contextInfo }, callback) => {
          if (!request) {
            return callback();
          }
          if (!request.startsWith('.') && !Path.isAbsolute(request)) {
            if (!request.startsWith('node:')) {
              externalRequests.add(request);
            }
            return callback(undefined, request);
          }
          const candidateAbs = Path.resolve(context || resolvedSrcDir, request);
          if (!isInsideDir(resolvedSrcDir, candidateAbs)) {
            const relOut = relativeSpecifier(resolvedSrcDir, candidateAbs).replace(
              CODE_FILE_RE,
              '.js'
            );
            externalRequests.add(relOut);
            return callback(undefined, relOut);
          }
          if (
            indexEntryPath &&
            contextInfo?.issuer === indexEntryPath &&
            resolveEntryFile(resolvedSrcDir, candidateAbs) === pluginEntryPath
          ) {
            return callback(undefined, './plugin.js');
          }
          if (/\.json$/i.test(request)) {
            return callback(undefined, relativeSpecifier(resolvedSrcDir, candidateAbs));
          }
          return callback();
        },
      ],
      plugins: [
        new rspack.BannerPlugin({
          banner: 'const __kbnBundleDirname = __dirname;',
          raw: true,
          entryOnly: false,
          include: new HostRegExp('\\.js$'),
        }),
      ],
      module: {
        parser: {
          javascript: {
            exportsPresence: false,
            requireResolve: false,
            requireAsExpression: false,
            exprContextCritical: false,
            wrappedContextCritical: false,
          },
        },
        rules: RSPACK_RULES,
      },
      optimization: {
        minimize: false,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        runtimeChunk: { name: 'plugin.runtime' },
        splitChunks: {
          chunks: 'all',
          minSize: 0,
          cacheGroups: {
            shared: {
              minChunks: 2,
              name: 'plugin.chunk-shared',
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      },
    });

    compiler.run((err, stats) => {
      if (err) {
        compiler.close(() => reject(err));
        return;
      }
      if (stats?.hasErrors()) {
        const msg =
          stats
            .toJson({ errors: true })
            .errors?.map((e) => e.message)
            .join('\n') || 'Unknown Rspack error';
        compiler.close(() => reject(new Error(`Rspack failed in ${resolvedSrcDir}:\n${msg}`)));
        return;
      }
      emittedAssetsCount = Object.keys(stats?.compilation.assets ?? {}).filter((a) =>
        a.endsWith('.js')
      ).length;
      compiler.close((closeErr) => (closeErr ? reject(closeErr) : resolve()));
    });
  });

  const distIndexJsPath = Path.join(resolvedDistDir, 'index.js');
  if (externalRequests.size > 0 && fs.existsSync(distIndexJsPath)) {
    const commentBlock = `/*\n${Array.from(externalRequests)
      .sort()
      .map((req) => `{import(${JSON.stringify(req)})}`)
      .join('\n')}\n*/\n`;
    const indexContent = await fs.promises.readFile(distIndexJsPath, 'utf8');
    const smIndex = indexContent.lastIndexOf('//# sourceMappingURL=');
    await fs.promises.writeFile(
      distIndexJsPath,
      smIndex !== -1
        ? `${indexContent.slice(0, smIndex)}${commentBlock}${indexContent.slice(smIndex)}`
        : `${indexContent}\n${commentBlock}`,
      'utf8'
    );
  }

  for (const [distStubPath, flatEntryName] of subdirStubs) {
    await fs.promises.mkdir(Path.dirname(distStubPath), { recursive: true });
    const relTarget = relativeSpecifier(
      Path.dirname(distStubPath),
      Path.join(resolvedDistDir, `${flatEntryName}.js`)
    );
    await fs.promises.writeFile(
      distStubPath,
      `"use strict";\nmodule.exports = require(${JSON.stringify(relTarget)});\n`,
      'utf8'
    );
  }

  return {
    bundled: true,
    sourceFilesCount: allSrcFiles.length,
    emittedFilesCount: emittedAssetsCount + subdirStubs.size,
  };
}

/**
 * Scans built `.js` files in `buildDir` and source `.ts`/`.js` files in plugin `server/`
 * directories for runtime cross-package `@kbn/<pkg>/server/<subpath>` imports.
 */
export async function scanCrossPackageServerImports(
  buildDir: string,
  plugins: PluginPackage[] = []
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  const builtDirs = ['src', 'x-pack', 'packages', 'node_modules/@kbn']
    .map((d) => Path.join(buildDir, d))
    .filter((d) => fs.existsSync(d));
  const filesToScan = (
    await Promise.all([
      ...builtDirs.map((d) => listFilesRecursive(d)),
      ...plugins.map((p) =>
        listFilesRecursive(Path.join(REPO_ROOT, p.normalizedRepoRelativeDir, 'server'), true)
      ),
    ])
  )
    .flat()
    .filter((f) => CODE_FILE_RE.test(f) && !f.includes(`${Path.sep}public${Path.sep}`));

  await asyncForEachWithLimit(filesToScan, cpus().length * 2, async (filePath) => {
    let content = await fs.promises.readFile(filePath, 'utf8');
    if (!content.includes('/server/')) {
      return;
    }
    if (!filePath.endsWith('.js')) {
      content = content.replace(TYPE_ONLY_IMPORT_EXPORT_RE, '');
    }
    for (const [, , , pkgName, subpath] of content.matchAll(CROSS_PKG_SERVER_IMPORT_RE)) {
      if (subpath && subpath !== 'index' && subpath !== 'index.js') {
        const pkgId = `@kbn/${pkgName}`;
        let set = result.get(pkgId);
        if (!set) {
          result.set(pkgId, (set = new Set()));
        }
        set.add(subpath);
      }
    }
  });

  return result;
}

export const BundlePluginServers: Task = {
  description:
    'Compiles and bundles plugin server directories directly from TypeScript with Rspack',

  async run(config, log, build) {
    const plugins = (config.getDistPluginsFromRepo() as PluginPackage[]).filter((pkg) =>
      shouldBundlePluginServer(pkg)
    );
    const crossPkgImports = await scanCrossPackageServerImports(build.resolvePath('.'), plugins);

    let bundledCount = 0;
    let totalSourceFiles = 0;
    let totalEmittedFiles = 0;

    await asyncForEachWithLimit(plugins, cpus().length, async (plugin) => {
      const res = await bundlePluginServerDir({
        srcServerDir: Path.join(REPO_ROOT, plugin.normalizedRepoRelativeDir, 'server'),
        distServerDir: build.resolvePath(plugin.normalizedRepoRelativeDir, 'server'),
        additionalEntries: Array.from(crossPkgImports.get(plugin.manifest.id) ?? []),
        sourceMaps: true,
      });
      if (res.bundled) {
        bundledCount += 1;
        totalSourceFiles += res.sourceFilesCount;
        totalEmittedFiles += res.emittedFilesCount;
      }
    });

    log.info(
      `Bundled ${bundledCount} plugin servers directly from TypeScript (${totalSourceFiles} source files -> ${totalEmittedFiles} emitted .js files, -${
        totalSourceFiles - totalEmittedFiles
      } files)`
    );
  },
};
