/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const { createRequire } = require('module');
const path = require('path');
const { build } = require('esbuild');
const { REPO_ROOT } = require('@kbn/repo-info');
const { getPackages } = require('@kbn/repo-packages');

const OUT_DIR = path.join(REPO_ROOT, 'target', 'task_bundles');
const RUNTIME_ENTRY = path.join(
  REPO_ROOT,
  'x-pack/platform/plugins/shared/task_manager/server/task_process/main'
);

/** Native modules stay out of the bundle and resolve from node_modules at run time. */
const EXTERNALS = ['re2'];

/** Every task type file declared in a plugin's `kibana.jsonc` (`plugin.taskTypes`). */
const getTaskBundleEntries = (packages = getPackages(REPO_ROOT)) =>
  packages
    .filter((pkg) => pkg.manifest.type === 'plugin' && pkg.manifest.plugin.taskTypes?.length)
    .flatMap((pkg) =>
      pkg.manifest.plugin.taskTypes.map((file) => ({
        pluginId: pkg.manifest.plugin.id,
        file: path.resolve(REPO_ROOT, pkg.directory, file),
        name: `${pkg.manifest.plugin.id}__${path.basename(file).replace(/\.task\.[jt]s$/, '')}`,
      }))
    );

/**
 * `@kbn/repo-info` finds the Kibana directory above the file that loads it, so a bundle copied
 * elsewhere, such as into a container, would not start. Only `@kbn/utils` uses it, for the
 * default config and data paths a task process does not read, so the bundle gets a fixed answer.
 */
const repoInfoPlugin = (version) => ({
  name: 'repo-info',
  setup(b) {
    b.onResolve({ filter: /^@kbn\/repo-info$/ }, () => ({
      path: 'repo-info',
      namespace: 'kbn-task-bundle',
    }));
    b.onLoad({ filter: /.*/, namespace: 'kbn-task-bundle' }, () => ({
      contents: `
        const path = require('path');
        const pkg = { version: ${JSON.stringify(version)}, build: {} };
        module.exports = {
          REPO_ROOT: process.cwd(),
          PKG_JSON: pkg,
          kibanaPackageJson: pkg,
          isKibanaDistributable: () => true,
          UPSTREAM_BRANCH: undefined,
          fromRoot: (...paths) => path.resolve(process.cwd(), ...paths),
        };`,
      loader: 'js',
    }));
  },
});

const peggyPlugin = {
  name: 'peggy',
  setup(b) {
    const peggy = require('peggy');
    b.onLoad({ filter: /\.peggy$/ }, (args) => ({
      contents: peggy.generate(fs.readFileSync(args.path, 'utf8'), {
        output: 'source',
        format: 'commonjs',
      }),
      loader: 'js',
    }));
  },
};

/**
 * Bundles the task type file together with the task process entry into one file:
 * `node <name>.js` serves `/health`, `/run` and `/cancel` for Task Manager.
 */
const buildTaskBundle = async ({ entry, outDir = OUT_DIR, kibanaVersion, sourcemap = true }) => {
  const version = kibanaVersion ?? require('@kbn/repo-info').kibanaPackageJson.version;
  const outfile = path.join(outDir, `${entry.name}.js`);
  await build({
    stdin: {
      contents: [
        `import { runTaskProcess } from ${JSON.stringify(RUNTIME_ENTRY)};`,
        `import { taskType } from ${JSON.stringify(entry.file)};`,
        `runTaskProcess(taskType);`,
      ].join('\n'),
      resolveDir: REPO_ROOT,
      sourcefile: `${entry.name}.entry.ts`,
      loader: 'ts',
    },
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    absWorkingDir: REPO_ROOT,
    tsconfig: path.join(REPO_ROOT, 'tsconfig.base.json'),
    logLevel: 'silent',
    logLimit: 0,
    minifyWhitespace: true,
    minifySyntax: true,
    keepNames: true,
    sourcemap: sourcemap ? 'linked' : false,
    sourcesContent: false,
    external: EXTERNALS,
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.url': '__kbn_import_meta_url',
      __KBN_VERSION__: JSON.stringify(version),
    },
    banner: {
      js: '"use strict";var __kbn_import_meta_url=require("url").pathToFileURL(__filename).href;',
    },
    loader: {
      '.md': 'text',
      '.txt': 'text',
      '.html': 'text',
      '.css': 'empty',
      '.svg': 'empty',
      '.png': 'empty',
      '.node': 'empty',
    },
    plugins: [peggyPlugin, repoInfoPlugin(version)],
  });
  return { name: entry.name, outfile, bytes: fs.statSync(outfile).size, entry };
};

/** The task type a file exports as `taskType`; loads it, so it needs the transpiler. */
const readTaskType = (file) => createRequire(__filename)(file).taskType.type;

/** Writes `manifest.json`: which task type each bundle serves, read by Kibana's supervisor. */
const writeManifest = (results, outDir = OUT_DIR, kibanaVersion) => {
  const manifest = {
    kibanaVersion: kibanaVersion ?? require('@kbn/repo-info').kibanaPackageJson.version,
    bundles: Object.fromEntries(
      results.map(({ entry, name, bytes }) => [
        name,
        { file: `${name}.js`, taskType: readTaskType(entry.file), bytes },
      ])
    ),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

module.exports = { OUT_DIR, getTaskBundleEntries, buildTaskBundle, writeManifest };
