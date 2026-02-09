/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest runner for Kibana
//
// Uses the Vite Module Runner to load vitest config files (which import @kbn/*
// packages that are only available as TypeScript source), then runs Vitest
// programmatically via its Node API — no subprocess, no pre-built packages.
//
// The config is augmented with the same server-runtime plugins that the Kibana
// dev server uses: OXC-based TypeScript transform (replaces esbuild) and a
// disk-backed transform cache (skips recompilation for unchanged files).
//
// Usage:
//   node --experimental-transform-types scripts/vitest.mts --config=path/to/vitest.config.mts
//   node --experimental-transform-types scripts/vitest.mts path/to/test.ts
//   node --experimental-transform-types scripts/vitest.mts --watch
//
// See all Vitest CLI options: https://vitest.dev/guide/cli.html

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Set up Node.js environment (warnings, DNS, security hardening)
await import(resolve(REPO_ROOT, 'src/setup_node_env/index.js'));

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

let configArg: string | undefined;
let watch = false;
const forwardArgs: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];

  if (arg === '--config' || arg === '-c') {
    configArg = argv[++i];
  } else if (arg.startsWith('--config=') || arg.startsWith('-c=')) {
    configArg = arg.split('=').slice(1).join('=');
  } else if (arg === '--watch' || arg === '-w') {
    watch = true;
  } else if (arg === '--run') {
    // --run is the default behaviour (no watch); just consume the flag
  } else {
    forwardArgs.push(arg);
  }
}

// ---------------------------------------------------------------------------
// Config discovery — walk up the directory tree looking for vitest.config.*
// ---------------------------------------------------------------------------

const CONFIG_NAMES = ['vitest.config.mts', 'vitest.config.ts', 'vitest.config.js'];

function findConfig(startDir: string): string | null {
  let dir = startDir;
  while (dir !== REPO_ROOT && dir !== resolve(dir, '..')) {
    for (const name of CONFIG_NAMES) {
      const candidate = resolve(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    dir = resolve(dir, '..');
  }
  // Also check the repo root itself
  for (const name of CONFIG_NAMES) {
    const candidate = resolve(REPO_ROOT, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const cwd = process.env.INIT_CWD || process.cwd();
let configPath: string;

if (configArg) {
  configPath = resolve(cwd, configArg);
} else {
  const discovered = findConfig(cwd);
  if (!discovered) {
    console.error(
      'No vitest.config.{mts,ts,js} found. Provide --config or run from a directory that contains one.'
    );
    process.exit(1);
  }
  configPath = discovered;
}

if (!existsSync(configPath)) {
  console.error(`Vitest config file not found: ${configPath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Bootstrap Vite Module Runner and load the config file
// ---------------------------------------------------------------------------
// The Vite Module Runner resolves @kbn/* packages from TypeScript source,
// which means vitest config files can import @kbn/vitest, @kbn/vite-config,
// etc. without any pre-build step.

const { createViteServerRuntime, kbnTransformDiskCachePlugins, kbnTypescriptTransformPlugin } =
  await import('@kbn/vite-server');

const runtime = await createViteServerRuntime({
  repoRoot: REPO_ROOT,
  hmr: false,
  useCache: true,
} as any);

const configModule = await runtime.executeModule<{ default?: Record<string, unknown> }>(
  configPath
);
const vitestConfig = (configModule.default ?? configModule) as Record<string, any>;

// NOTE: Do NOT call runtime.stop() here. The vitest config contains Vite
// plugins (kbnPeggyPlugin, kbnResolverPlugin, etc.) that were instantiated
// inside the module runner context. Their closures reference the runner's
// import() function, so the runner must stay alive while vitest uses them.

// ---------------------------------------------------------------------------
// Augment with server-runtime plugins
// ---------------------------------------------------------------------------
// Reuse the same transform pipeline the Kibana dev server uses:
//
//   1. Transform disk cache (reader)  — enforce: 'pre'
//      Short-circuits transforms for files whose content hash hasn't changed.
//
//   2. <original vitest plugins>       — normal priority
//      kbnResolverPlugin, kbnPeggyPlugin, kbnSpecialModulesPlugin, etc.
//
//   3. OXC TypeScript transform        — normal priority (replaces esbuild)
//      Uses Rolldown's OXC directly with pre-configured options, bypassing
//      expensive per-file tsconfig.json resolution.
//
//   4. Transform disk cache (writer)   — enforce: 'post'
//      Persists transform results to disk for next run.
//
// This gives vitest the same fast OXC transforms and 100% cache hit rates
// on warm runs that the dev server enjoys.

const [transformCacheReader, transformCacheWriter] = kbnTransformDiskCachePlugins({
  repoRoot: REPO_ROOT,
});

const existingPlugins = vitestConfig.plugins || [];

const augmentedConfig = {
  ...vitestConfig,

  plugins: [
    // Pre: check transform cache before any compilation
    transformCacheReader,
    // Original plugins from the vitest config (resolver, peggy, jest-compat, etc.)
    ...existingPlugins,
    // Normal: OXC-based TypeScript/JSX transform (same as dev server)
    kbnTypescriptTransformPlugin(),
    // Post: persist transform results to disk
    transformCacheWriter,
  ],

  // Disable Vite's built-in transform pipelines — our plugin calls OXC
  // directly with pre-configured options, bypassing expensive per-file
  // tsconfig.json resolution.  Handles .ts, .tsx, .js, .jsx, .mts, .cts.
  esbuild: false,
  oxc: false,
};

// ---------------------------------------------------------------------------
// Run Vitest programmatically
// ---------------------------------------------------------------------------

// Positional args (non-flag args) are treated as test-file filters
const testFilters = forwardArgs.filter((arg) => !arg.startsWith('-'));

// Use createVitest (not startVitest) because startVitest's internal start()
// re-initialises projects with default include patterns, ignoring our custom
// patterns when configFile: false.  createVitest + init() +
// globTestSpecifications() + runTestSpecifications() gives us full control.
const { createVitest } = await import('vitest/node');

const { test: testConfig, ...viteConfig } = augmentedConfig as Record<string, any>;

const vitest = await createVitest(
  'test',
  {
    run: !watch,
    watch,
    ...testConfig,
  },
  {
    configFile: false,
    ...viteConfig,
  } as any
);

await vitest.init();

// Discover test files using vitest-level config (which has our include patterns).
// We use globTestSpecifications() + runTestSpecifications() instead of start()
// because start() re-initializes projects with default include patterns,
// ignoring our custom patterns when configFile: false.
let specs = await vitest.globTestSpecifications();

// Apply CLI test-file filters (positional args narrow down which tests run)
if (testFilters.length > 0) {
  specs = specs.filter((s: any) =>
    testFilters.some((f: string) => s.moduleId.includes(f))
  );
}

if (specs.length === 0) {
  console.log('\nNo test files found.\n');
  console.log('include:', vitest.config.include.join(', '));
  console.log('exclude:', vitest.config.exclude.join(', '));
  await vitest.close();
  process.exit(0);
}

await vitest.runTestSpecifications(specs);
await vitest.close();

// Clean up the module runner now that vitest has finished.
await runtime.stop();
