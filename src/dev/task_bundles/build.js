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
const MagicString = require('magic-string');
const remapping = require('@ampproject/remapping');
const { REPO_ROOT } = require('@kbn/repo-info');
const { getPackages } = require('@kbn/repo-packages');
const { escapeNonLatin1 } = require('./escape_non_latin1');
const { copyTaskRuntimeDependencies } = require('./copy_runtime_dependencies');

const OUT_DIR = path.join(REPO_ROOT, 'target', 'task_bundles');
const RUNTIME_ENTRY = path.join(
  REPO_ROOT,
  'x-pack/platform/plugins/shared/task_manager/server/task_process/main'
);

/** Loads a task type file using the registered transpiler. */
const loadTaskType = (file) => createRequire(__filename)(file).taskType;

/**
 * Native modules stay out of the bundle and resolve from node_modules at run time. `canvas` is the
 * optional native dependency of jsdom, which jsdom loads inside a try/catch.
 */
// `node-liblzma` (pulled in by `just-bash`) and `@mongodb-js/zstd` (the MongoDB connector's
// compression dependency) do a runtime `require('node-gyp-build'...)` relative to their own
// package directory, which esbuild's bundling breaks; they stay a real `require()` too.
const EXTERNALS = ['re2', 'canvas', 'node-liblzma', '@mongodb-js/zstd'];

// The Node resolver selects EUI's CommonJS entry. A server task that uses one palette helper then
// retains EUI's entire UI library. Resolve the package entry to its declared ES module instead.
const euiModulePlugin = {
  name: 'eui-esm-entry',
  setup(b) {
    b.onResolve({ filter: /^@elastic\/eui$/ }, () => {
      const manifestFile = require.resolve('@elastic/eui/package.json');
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      return { path: path.resolve(path.dirname(manifestFile), manifest.module, 'index.js') };
    });
  },
};

// ECS exposes EcsVersion beside its full field schema. The ESM entry lets esbuild retain only
// the version when a task process uses JSON logging.
const ecsModulePlugin = {
  name: 'ecs-esm-entry',
  setup(b) {
    b.onResolve({ filter: /^@elastic\/ecs$/ }, () => ({
      path: require.resolve('@elastic/ecs/build/esm/index.js'),
    }));
  },
};

/** Share the CommonJS Lodash namespace between imports without changing other interop modules. */
const memoizeLodashNamespaces = (result, outDir) => {
  const helperFile = path.join(outDir, 'lodash_namespace.mjs');
  const helperKey = path.relative(REPO_ROOT, helperFile);
  let replaced = 0;
  for (const [outputFile, output] of Object.entries(result.metafile.outputs)) {
    if (!outputFile.endsWith('.mjs')) continue;
    const file = path.resolve(REPO_ROOT, outputFile);
    const original = fs.readFileSync(file, 'utf8');
    const call = /__toESM\(require_lodash\(\)(?:,\s*([01]))?\)/g;
    const edits = new MagicString(original);
    let match;
    let count = 0;
    while ((match = call.exec(original))) {
      edits.overwrite(
        match.index,
        match.index + match[0].length,
        `__kbnLodashToESM(require_lodash()${match[1] ? `, ${match[1]}` : ''})`
      );
      count++;
    }
    if (!count) continue;
    replaced += count;
    const relativeHelper = `./${path
      .relative(path.dirname(file), helperFile)
      .replaceAll(path.sep, '/')}`;
    edits.prepend(`import { toESM as __kbnLodashToESM } from ${JSON.stringify(relativeHelper)};\n`);
    fs.writeFileSync(file, edits.toString());
    const mapFile = `${file}.map`;
    if (fs.existsSync(mapFile)) {
      const nextMap = edits.generateMap({
        file: path.basename(file),
        source: path.basename(file),
        hires: true,
      });
      const originalMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
      fs.writeFileSync(mapFile, JSON.stringify(remapping([nextMap, originalMap], () => null)));
    }
    output.imports.push({ path: helperKey, kind: 'import-statement' });
  }
  if (replaced) {
    fs.copyFileSync(path.join(__dirname, 'lodash_namespace.mjs'), helperFile);
    result.metafile.outputs[helperKey] = {
      bytes: fs.statSync(helperFile).size,
      imports: [],
      inputs: {},
    };
  }
  return replaced;
};

/**
 * The files plugins contribute under a key (`plugin.taskTypeContributions` in `kibana.jsonc`), such as
 * `alerting-rule-run` for what every rule run needs. Each file exports `contribution`.
 */
const getContributionFiles = (key, packages = getPackages(REPO_ROOT)) =>
  packages
    .filter((pkg) => pkg.manifest.type === 'plugin')
    .flatMap((pkg) =>
      (pkg.manifest.plugin.taskTypeContributions?.[key] ?? []).map((file) =>
        path.resolve(REPO_ROOT, pkg.directory, file)
      )
    )
    .sort();

/** Resolves contribution keys added by native runtimes until the declaration graph is complete. */
const resolveTaskContributions = (
  taskType,
  additionalContributions = {},
  getFiles = getContributionFiles,
  loadContribution = (file) => createRequire(__filename)(file).contribution
) => {
  const filesByKey = {};
  const contributions = {};
  const keys = new Set(taskType.contributions?.keys ?? []);
  while ([...keys].some((key) => !(key in filesByKey))) {
    for (const key of keys) {
      if (key in filesByKey) continue;
      const files = [...new Set([...getFiles(key), ...(additionalContributions[key] ?? [])])];
      filesByKey[key] = files;
      contributions[key] = files.map((file) => {
        const contribution = loadContribution(file);
        if (!contribution) throw new Error(`Task contribution ${file} has no contribution export`);
        for (const dependency of contribution.declares?.contributionKeys ?? [])
          keys.add(dependency);
        return contribution;
      });
    }
    const applied = taskType.contributions?.apply?.(contributions) ?? taskType;
    for (const key of applied.contributions?.keys ?? []) keys.add(key);
  }
  return filesByKey;
};

/** Collects the flag defaults of the module and every contributed native SDK. */
const collectTaskFeatureFlags = (taskType, contributions) =>
  Object.assign(
    {},
    taskType.featureFlags,
    ...contributions.map((item) => item.declares?.featureFlags)
  );

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

/**
 * Treats every workspace source file (not `node_modules`) as free of import-time side effects, as
 * Kibana's modules are. Then a barrel such as `@kbn/task-manager-plugin/server` costs only what is
 * used from it: without this, importing one constant from it pulls in the plugin class and
 * everything the plugin imports.
 */
/**
 * Core's rendering service imports the UI bundle locations at load, and they need built assets and
 * the repository on disk. A task process renders nothing.
 */
const uiSharedDepsStubPlugin = {
  name: 'ui-shared-deps-stub',
  setup(b) {
    b.onResolve({ filter: /^@kbn\/ui-shared-deps-(npm|src)$/ }, (args) => ({
      path: args.path,
      namespace: 'kbn-task-bundle-ui-stub',
    }));
    b.onLoad({ filter: /.*/, namespace: 'kbn-task-bundle-ui-stub' }, () => ({
      contents: `module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : 'stub-' + String(key) });`,
      loader: 'js',
    }));
  },
};

/** The native APM agent loads instrumentation files relative to its installed package. */
const nativeApmAgentPlugin = {
  name: 'native-apm-agent',
  setup(b) {
    b.onResolve({ filter: /^elastic-apm-node$/ }, (args) =>
      args.namespace === 'task-process-native-apm'
        ? { path: args.path, external: true }
        : { path: args.path, namespace: 'task-process-native-apm' }
    );
    b.onLoad({ filter: /.*/, namespace: 'task-process-native-apm' }, () => ({
      contents: `module.exports = require('elastic-apm-node');`,
      loader: 'js',
    }));
  },
};

/** Imports kept for their side effects, which the pure workspace plugin would otherwise drop. */
const SIDE_EFFECT_FILES = /hapi_request_refs|[\\/]kbn-security-hardening[\\/]prototype\.[jt]s$/;

const pureWorkspacePlugin = {
  name: 'pure-workspace',
  setup(b) {
    b.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData?.skipPure || args.kind === 'entry-point') return undefined;
      const resolved = await b.resolve(args.path, {
        kind: args.kind,
        importer: args.importer,
        namespace: args.namespace,
        resolveDir: args.resolveDir,
        with: args.with,
        pluginData: { skipPure: true },
      });
      if (resolved.errors.length || resolved.external || resolved.namespace !== 'file') {
        return resolved.errors.length ? undefined : resolved;
      }
      return resolved.path.includes(`${path.sep}node_modules${path.sep}`) ||
        SIDE_EFFECT_FILES.test(resolved.path)
        ? resolved
        : { ...resolved, sideEffects: false };
    });
  },
};

const peggyPlugin = {
  name: 'peggy',
  setup(b) {
    // The grammar's own config (`<grammar>.config.json`, such as the KQL grammar's extra start rule)
    // is part of how it is generated, as it is for every other bundler of Kibana.
    const { getJsSourceSync } = require('@kbn/peggy');
    b.onLoad({ filter: /\.peggy$/ }, (args) => ({
      contents: getJsSourceSync({
        path: args.path,
        content: fs.readFileSync(args.path, 'utf8'),
        format: 'commonjs',
      }).source,
      loader: 'js',
    }));
  },
};

/** Returns static startup imports and the generated entry's imports awaited before readiness. */
const getStartupOutputs = (metafile, outfile) => {
  const outputs = new Map(
    Object.entries(metafile.outputs).map(([file, output]) => [
      path.resolve(REPO_ROOT, file),
      output,
    ])
  );
  const entryFile = path.resolve(outfile);
  const taskEntry = outputs.get(entryFile)?.entryPoint?.endsWith('.entry.ts') === true;
  const loaded = new Set();
  const visit = (file) => {
    if (loaded.has(file)) return;
    const output = outputs.get(file);
    if (!output) return;
    loaded.add(file);
    for (const dependency of output.imports) {
      if (dependency.external) continue;
      if (dependency.kind === 'dynamic-import' && !(taskEntry && file === entryFile)) continue;
      visit(path.resolve(REPO_ROOT, dependency.path));
    }
  };
  visit(entryFile);
  if (taskEntry) {
    for (const [file, output] of outputs) {
      if (
        Object.keys(output.inputs ?? {}).some((input) =>
          input.endsWith('/task_process/instrumentation.ts')
        )
      )
        visit(file);
    }
  }
  return [...loaded];
};

/** Attributes generated startup bytes to packages and lists workspace imports of EUI. */
const getStartupAnalysis = (metafile, outfile) => {
  const bytesByPackage = new Map();
  const euiImporters = new Set();
  const startupFiles = getStartupOutputs(metafile, outfile);
  for (const file of startupFiles) {
    const output = metafile.outputs[path.relative(REPO_ROOT, file)] ?? metafile.outputs[file];
    for (const [input, { bytesInOutput }] of Object.entries(output?.inputs ?? {})) {
      const parts = input
        .replace(/^node_modules\//, '')
        .split('/node_modules/')
        .pop()
        .split('/');
      let name = 'workspace';
      if (input.includes('/node_modules/') || input.startsWith('node_modules/')) {
        name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
      }
      bytesByPackage.set(name, (bytesByPackage.get(name) ?? 0) + bytesInOutput);
      if (
        name === 'workspace' &&
        metafile.inputs[input]?.imports?.some(
          ({ path: imported }) =>
            imported === 'node_modules/@elastic/eui/lib/index.js' ||
            imported === 'node_modules/@elastic/eui/es/index.js'
        )
      ) {
        euiImporters.add(input);
      }
    }
  }
  return {
    packages: Object.fromEntries([...bytesByPackage].sort((a, b) => b[1] - a[1])),
    euiImporters: [...euiImporters].sort(),
  };
};

/**
 * Reachable bytes per contribution file: for each, the output chunk(s) esbuild generated for its
 * `import()` call site in the entry, plus what they statically import (not through a further
 * dynamic import). A contribution's number is inclusive, not exclusive: two contributions that both
 * reference a shared chunk each count its full size, since that is what removing either one alone
 * would not save. Used to order future pack and contribution work by measured weight, not guesswork.
 */
const getContributionAnalysis = (metafile, contributionFiles) => {
  const outputs = Object.entries(metafile.outputs).map(([file, output]) => [
    path.resolve(REPO_ROOT, file),
    output,
  ]);
  return contributionFiles.map((contributionFile) => {
    const absolute = path.resolve(REPO_ROOT, contributionFile);
    // The output chunk esbuild generated to hold this file's own code (not one it merely imports).
    const [rootFile] =
      outputs.find(([, output]) =>
        Object.keys(output.inputs ?? {}).includes(path.relative(REPO_ROOT, absolute))
      ) ?? [];
    if (!rootFile) return { file: path.relative(REPO_ROOT, absolute), bytes: 0 };
    const loaded = new Set();
    const visit = (file) => {
      if (loaded.has(file)) return;
      const output = metafile.outputs[path.relative(REPO_ROOT, file)];
      if (!output) return;
      loaded.add(file);
      for (const dependency of output.imports) {
        if (dependency.external || dependency.kind === 'dynamic-import') continue;
        visit(path.resolve(REPO_ROOT, dependency.path));
      }
    };
    visit(rootFile);
    const bytes = [...loaded]
      .filter((file) => file.endsWith('.mjs'))
      .reduce((total, file) => total + fs.statSync(file).size, 0);
    return { file: path.relative(REPO_ROOT, absolute), bytes };
  });
};

/** The id a pack is known by, inside a generated entry and across the manifest and dispatch. */
const packId = (key, absoluteFile) => `${key}:${path.relative(REPO_ROOT, absoluteFile)}`;

/**
 * One pack per contribution file: its id and what it declares (`stepTypes`, `requires`,
 * `registersConnectorTypes`, when the contribution is a workflow step or a rule-run connector
 * registration; read by Main to resolve a workflow definition to the packs it needs).
 */
const getPackManifest = (contributions, declarations = new Map()) =>
  Object.entries(contributions).flatMap(([key, files]) =>
    files.map((file) => {
      const absolute = path.resolve(REPO_ROOT, file);
      const contribution = declarations.get(file);
      const declares = contribution?.declares ?? {};
      return {
        id: packId(key, absolute),
        file: path.relative(REPO_ROOT, absolute),
        stepTypes: declares.stepTypes ?? [],
        requires: declares.requires ?? [],
        ...(declares.registersConnectorTypes ? { registersConnectorTypes: true } : {}),
        provides: Object.keys(contribution?.provides ?? {}),
      };
    })
  );

/** Lists the complete reachable code and source maps belonging to one native task entry. */
const getBundleOutputs = (metafile, outfile) => {
  const outputs = new Map(
    Object.entries(metafile.outputs).map(([file, metadata]) => [
      path.resolve(REPO_ROOT, file),
      metadata,
    ])
  );
  const files = new Set();
  const visit = (file) => {
    if (files.has(file) || !outputs.has(file)) return;
    files.add(file);
    if (outputs.has(`${file}.map`)) files.add(`${file}.map`);
    for (const dependency of outputs.get(file).imports ?? []) {
      if (!dependency.external) visit(path.resolve(REPO_ROOT, dependency.path));
    }
  };
  visit(path.resolve(outfile));
  return [...files];
};

// Syntax minification drops cross-entry imports backing namespace getters in the pinned esbuild.
// `keepNames` is off and identifiers are minified: nothing in the task process relies on a
// function or class's original `.name` for behavior (only `instanceof` and error codes), and
// minifying identifiers shrinks the floor's ~24 MB of retained V8 bytecode/string tables.
const TASK_BUNDLE_OPTIMIZATION = {
  minifyWhitespace: true,
  minifySyntax: false,
  minifyIdentifiers: true,
  keepNames: false,
};

/** Builds native task entries in one graph, sharing their common runtime chunks. */
const buildTaskBundles = async ({
  entries,
  outDir = OUT_DIR,
  kibanaVersion,
  sourcemap = true,
  metafile = false,
  additionalContributions = {},
  // False builds the floor alone (no plugin's contributions), for baselining what every workflow
  // worker pays before any step, trigger or service a plugin contributes is added.
  withContributions = true,
}) => {
  const version = kibanaVersion ?? require('@kbn/repo-info').kibanaPackageJson.version;
  const runtime = copyTaskRuntimeDependencies(outDir);
  const packages = getPackages(REPO_ROOT);
  const prepared = entries.map((entry) => {
    const loaded = loadTaskType(entry.file);
    if (!loaded) throw new Error(`Task module ${entry.file} has no taskType export`);
    // A task type's own plugin may declare contributions it requires of itself (the workflow
    // engine's own scheduling snapshot and runtime services, say), not an optional extension from
    // another plugin. The floor keeps those and drops every other plugin's.
    const ownPluginDir = packages.find((pkg) =>
      path
        .resolve(REPO_ROOT, entry.file)
        .startsWith(path.resolve(REPO_ROOT, pkg.directory) + path.sep)
    )?.directory;
    const getFiles = withContributions
      ? getContributionFiles
      : (key) =>
          getContributionFiles(key, packages).filter((file) =>
            ownPluginDir ? file.startsWith(path.resolve(REPO_ROOT, ownPluginDir) + path.sep) : false
          );
    // What the module says it takes from other plugins: every plugin's file under each key.
    const declarations = new Map();
    const contributions = resolveTaskContributions(
      loaded,
      withContributions ? additionalContributions : {},
      getFiles,
      (file) => {
        const contribution = createRequire(__filename)(file).contribution;
        declarations.set(file, contribution);
        return contribution;
      }
    );
    const featureFlags = collectTaskFeatureFlags(loaded, [...declarations.values()]);
    // One pack per contribution file. Without a selection from Main (`init.packs`), every pack
    // loads, which is the pre-pack behavior: nothing here changes what a worker does if nothing
    // upstream ever sets `packs` on `TaskProcessInit`.
    const packs = Object.entries(contributions).flatMap(([key, files]) =>
      files.map((file) => ({ id: packId(key, path.resolve(REPO_ROOT, file)), key, file }))
    );
    return {
      entry,
      featureFlags,
      contributions,
      declarations,
      packs,
      contents: [
        `import { bootstrapTaskProcess } from ${JSON.stringify(
          path.join(path.dirname(RUNTIME_ENTRY), 'bootstrap')
        )};`,
        `const initialization = await bootstrapTaskProcess();`,
        `const PACKS = [`,
        ...packs.map(
          ({ id, key, file }) =>
            `  { id: ${JSON.stringify(id)}, key: ${JSON.stringify(
              key
            )}, load: () => import(${JSON.stringify(file)}) },`
        ),
        `];`,
        `const selected = new Set(initialization.init.packs ?? PACKS.map((pack) => pack.id));`,
        `const loadedPacks = PACKS.filter((pack) => selected.has(pack.id));`,
        `const [runtime, taskModule, ...packModules] = await Promise.all([`,
        `  import(${JSON.stringify(RUNTIME_ENTRY)}),`,
        `  import(${JSON.stringify(entry.file)}),`,
        `  ...loadedPacks.map((pack) => pack.load()),`,
        `]);`,
        `const contributions = {};`,
        `loadedPacks.forEach((pack, i) => {`,
        `  (contributions[pack.key] ??= []).push(packModules[i].contribution);`,
        `});`,
        `runtime.runTaskProcess(taskModule.taskType, {`,
        `  ...initialization,`,
        `  contributions,`,
        `});`,
      ].join('\n'),
    };
  });
  const sources = new Map(prepared.map((item) => [`${item.entry.name}.entry.ts`, item.contents]));
  const taskEntriesPlugin = {
    name: 'native-task-entries',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^task-entry:/ }, ({ path: file }) => ({
        path: file.slice('task-entry:'.length),
        namespace: 'task-entry',
      }));
      buildApi.onLoad({ filter: /.*/, namespace: 'task-entry' }, ({ path: file }) => ({
        contents: sources.get(file),
        resolveDir: REPO_ROOT,
        loader: 'ts',
      }));
    },
  };
  const result = await build({
    entryPoints: prepared.map(({ entry }) => ({
      in: `task-entry:${entry.name}.entry.ts`,
      out: entry.name,
    })),
    outdir: outDir,
    entryNames: '[name]',
    chunkNames: `chunks/${entries.length === 1 ? entries[0].name : 'shared'}/[name]-[hash]`,
    outExtension: { '.js': '.mjs' },
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    splitting: true,
    absWorkingDir: REPO_ROOT,
    tsconfig: path.join(REPO_ROOT, 'tsconfig.base.json'),
    logLevel: 'silent',
    logLimit: 0,
    metafile: true,
    ...TASK_BUNDLE_OPTIMIZATION,
    sourcemap: sourcemap ? 'linked' : false,
    sourcesContent: false,
    external: EXTERNALS,
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.url': '__kbn_import_meta_url',
      __KBN_VERSION__: JSON.stringify(version),
    },
    banner: {
      js: [
        'import { createRequire as __kbn_createRequire } from "node:module";',
        'import { fileURLToPath as __kbn_fileURLToPath } from "node:url";',
        'import { dirname as __kbn_dirname } from "node:path";',
        'var require=__kbn_createRequire(import.meta.url),',
        '__filename=__kbn_fileURLToPath(import.meta.url),',
        '__dirname=__kbn_dirname(__filename),__kbn_import_meta_url=import.meta.url;',
      ].join(''),
    },
    loader: {
      '.md': 'text',
      '.txt': 'text',
      '.text': 'text',
      '.html': 'text',
      '.yaml': 'text',
      '.css': 'empty',
      '.svg': 'empty',
      '.png': 'empty',
      '.node': 'empty',
    },
    plugins: [
      taskEntriesPlugin,
      euiModulePlugin,
      ecsModulePlugin,
      uiSharedDepsStubPlugin,
      nativeApmAgentPlugin,
      pureWorkspacePlugin,
      peggyPlugin,
      repoInfoPlugin(version),
    ],
  });
  memoizeLodashNamespaces(result, outDir);
  const files = Object.keys(result.metafile.outputs).map((file) => path.resolve(REPO_ROOT, file));
  for (const file of files) {
    if (!file.endsWith('.mjs')) continue;
    // V8 retains each loaded chunk's source; keep every chunk at one byte per character.
    fs.writeFileSync(file, escapeNonLatin1(fs.readFileSync(file, 'utf8')));
  }
  return prepared.map(({ entry, featureFlags, contributions, declarations, packs }) => {
    const outfile = path.join(outDir, `${entry.name}.mjs`);
    const bundleFiles = getBundleOutputs(result.metafile, outfile);
    const contributionBytes = Object.fromEntries(
      Object.entries(contributions).map(([key, files]) => [
        key,
        getContributionAnalysis(result.metafile, files),
      ])
    );
    return {
      name: entry.name,
      runtime,
      outfile,
      bytes: bundleFiles
        .filter((file) => file.endsWith('.mjs'))
        .reduce((total, file) => total + fs.statSync(file).size, 0),
      files: bundleFiles,
      startupBytes: getStartupOutputs(result.metafile, outfile).reduce(
        (total, file) => total + fs.statSync(file).size,
        0
      ),
      startupAnalysis: {
        ...getStartupAnalysis(result.metafile, outfile),
        contributions: contributionBytes,
      },
      packs: getPackManifest(contributions, declarations),
      packIds: packs.map(({ id }) => id),
      entry,
      featureFlags,
      ...(metafile ? { metafile: result.metafile } : {}),
    };
  });
};

/** Builds one task entry with the same graph and metadata as a complete package. */
const buildTaskBundle = async ({ entry, ...options }) => {
  const [result] = await buildTaskBundles({ entries: [entry], ...options });
  return result;
};

/** The task type a file exports as `taskType`; loads it, so it needs the transpiler. */
const readTaskType = (file) => createRequire(__filename)(file).taskType.type;

/** Writes `manifest.json`: which task type each bundle serves, read by Kibana's supervisor. */
const writeManifest = (results, outDir = OUT_DIR, kibanaVersion) => {
  const manifest = {
    kibanaVersion: kibanaVersion ?? require('@kbn/repo-info').kibanaPackageJson.version,
    runtime: results[0]?.runtime,
    bundles: Object.fromEntries(
      results.map(
        ({
          entry,
          name,
          bytes,
          outfile,
          files,
          startupBytes,
          startupAnalysis,
          featureFlags,
          packs,
          packIds,
        }) => [
          name,
          {
            file: path.relative(outDir, outfile),
            files: files.map((file) => path.relative(outDir, file)),
            taskType: readTaskType(entry.file),
            bytes,
            startupBytes,
            startupAnalysis,
            featureFlags,
            packs,
            packIds,
          },
        ]
      )
    ),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

module.exports = {
  TASK_BUNDLE_OPTIMIZATION,
  euiModulePlugin,
  ecsModulePlugin,
  memoizeLodashNamespaces,
  OUT_DIR,
  getTaskBundleEntries,
  getContributionFiles,
  resolveTaskContributions,
  collectTaskFeatureFlags,
  getStartupOutputs,
  getStartupAnalysis,
  getContributionAnalysis,
  getPackManifest,
  packId,
  buildTaskBundle,
  buildTaskBundles,
  getBundleOutputs,
  writeManifest,
};
