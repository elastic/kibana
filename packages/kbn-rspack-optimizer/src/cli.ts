/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog, pickLevelFromFlags } from '@kbn/tooling-log';
import getopts from 'getopts';
import { runHybridBuild } from './run_hybrid_build';
import { runSingleRspackBuild } from './run_single_rspack_build';
import { runRspackBuild } from './run_rspack_build';
import type { ThemeTag } from './types';

export interface CliOptions {
  defaultLimitsPath?: string;
}

type BuildMode = 'hybrid' | 'single' | 'legacy';

/**
 * Run the RSPack optimizer CLI
 */
export async function runRspackCli(options: CliOptions = {}): Promise<void> {
  const { defaultLimitsPath } = options;

  const rawArgs = process.argv.slice(2);
  const args = getopts(rawArgs, {
    boolean: [
      'watch',
      'dist',
      'examples',
      'test-plugins',
      'profile',
      'help',
      'no-cache',
      'single', // Force single compilation (no isolated builds)
      'legacy', // Use legacy bundle-refs approach
    ],
    string: ['focus', 'filter', 'themes', 'output-root', 'plugins'],
    alias: {
      h: 'help',
      w: 'watch',
      p: 'plugins',
    },
    default: {
      watch: false,
      dist: false,
      examples: false,
      'test-plugins': false,
      profile: false,
      'no-cache': false,
      single: false,
      legacy: false,
    },
  });

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const log = new ToolingLog({
    level: pickLevelFromFlags({
      verbose: args.verbose,
      quiet: args.quiet,
      silent: args.silent,
    }),
    writeTo: process.stdout,
  });

  const focus = args.focus ? args.focus.split(',').map((s: string) => s.trim()) : undefined;
  const filter = args.filter ? args.filter.split(',').map((s: string) => s.trim()) : undefined;
  const plugins = args.plugins ? args.plugins.split(',').map((s: string) => s.trim()) : undefined;
  const themes = parseThemes(args.themes);

  const isIsolatedBuild = plugins && plugins.length > 0;

  // Determine build mode
  // Default: hybrid (shared container + optimized plugins)
  let mode: BuildMode = 'hybrid';
  if (args.legacy || process.env.KBN_RSPACK_LEGACY === 'true') {
    mode = 'legacy';
  } else if (args.single && !isIsolatedBuild) {
    mode = 'single';
  }

  // Isolated builds MUST use hybrid
  if (isIsolatedBuild && mode !== 'hybrid') {
    log.warning('Isolated plugin builds (--plugins) require hybrid mode');
    log.warning('Switching to hybrid mode...');
    mode = 'hybrid';
  }

  try {
    const startTime = Date.now();

    const buildOptions = {
      repoRoot: REPO_ROOT,
      outputRoot: args['output-root'] ? Path.resolve(args['output-root']) : REPO_ROOT,
      watch: args.watch,
      dist: args.dist,
      cache: !args['no-cache'],
      examples: args.examples,
      testPlugins: args['test-plugins'],
      themeTags: themes,
      limitsPath: defaultLimitsPath,
      focus,
      filter,
      plugins,
      profile: args.profile,
      log,
    };

    let result;

    switch (mode) {
      case 'hybrid':
        if (isIsolatedBuild) {
          log.info(`Building isolated plugins: ${plugins!.join(', ')}`);
        } else {
          log.info('Building with hybrid mode (shared container + optimized plugins)...');
        }
        result = await runHybridBuild(buildOptions);
        break;
      case 'single':
        log.info('Building with single compilation (fastest, no isolated builds)...');
        result = await runSingleRspackBuild(buildOptions);
        break;
      case 'legacy':
        log.info('Building with legacy bundle-refs mode...');
        result = await runRspackBuild(buildOptions);
        break;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success) {
      log.success(`RSPack build completed in ${duration}s`);
      if (!args.watch) {
        process.exit(0);
      }
    } else {
      log.error(`RSPack build failed after ${duration}s`);
      process.exit(1);
    }
  } catch (error) {
    log.error('RSPack optimizer failed:', error);
    process.exit(1);
  }
}

function parseThemes(themesArg: string | undefined): ThemeTag[] {
  if (!themesArg || themesArg === '*') {
    return ['borealislight', 'borealisdark'];
  }

  const themes = themesArg.split(',').map((s) => s.trim()) as ThemeTag[];
  const valid: ThemeTag[] = ['borealislight', 'borealisdark'];

  for (const theme of themes) {
    if (!valid.includes(theme)) {
      console.warn(`Warning: Unknown theme "${theme}", valid themes are: ${valid.join(', ')}`);
    }
  }

  return themes.filter((t) => valid.includes(t));
}

function printHelp(): void {
  console.log(`
RSPack Optimizer - Build Kibana platform plugin bundles

Usage:
  node scripts/build_rspack_bundles.js [options]

Options:
  --watch, -w           Enable watch mode for development
  --dist                Build for distribution (minified, no source maps)
  --examples            Include example plugins
  --test-plugins        Include test plugins
  --focus <ids>         Comma-separated plugin IDs to include
  --filter <ids>        Comma-separated plugin IDs to exclude
  --plugins, -p <ids>   Build ONLY these plugins (isolated build)
  --themes <tags>       Comma-separated theme tags to build (default: all)
  --output-root <dir>   Output root directory (default: repo root)
  --profile             Enable profiling/stats output
  --no-cache            Disable filesystem caching
  --single              Force single compilation (no isolated build support)
  --legacy              Use legacy bundle-refs mode
  --verbose             Verbose output
  --quiet               Quiet output
  --silent              Silent output
  --help, -h            Show this help message

Environment Variables:
  KBN_USE_RSPACK=true         Use RSPack optimizer
  KBN_RSPACK_LEGACY=true      Use legacy bundle-refs mode

Build Modes:

  Hybrid Mode (default) - OPTIMAL:
    - Shared deps (React, EUI, lodash) built ONCE into container
    - Plugins reference shared container (ZERO duplication)
    - Supports isolated builds (--plugins)
    - Supports external plugins

  Single Compilation (--single):
    - ALL plugins in ONE compilation (fastest full build)
    - Cannot build plugins in isolation
    - Use when you never need isolated builds

  Legacy Mode (--legacy):
    - Uses __kbnBundles__ for cross-plugin imports
    - Compatibility mode for gradual migration

Isolated Plugin Builds (--plugins):
  Build specific plugins WITHOUT rebuilding everything.
  Output is 100% compatible with existing distributed bundles.

  Requirements:
  - A full build must exist first (creates shared container)

  Use cases:
  - PR changed only discover → build only discover
  - Third-party plugin development
  - Hot-swap plugins in development

Bundle Size Comparison:

  Hybrid Mode (default):
    kbn-shared/         ~4 MB   (shared deps, built ONCE)
    dashboard.plugin.js ~50 KB  (plugin code only!)
    discover.plugin.js  ~80 KB  (plugin code only!)
    Total: ~4.1 MB

  Other approaches:
    dashboard.plugin.js ~1.5 MB (includes React, EUI, etc.)
    discover.plugin.js  ~1.8 MB (includes React, EUI, etc.)
    Total: ~3.3 MB but DOWNLOADED TWICE = ~6.6 MB

Examples:
  # Full build (default hybrid mode)
  node scripts/build_rspack_bundles.js --dist

  # Development with watch
  node scripts/build_rspack_bundles.js --watch

  # Isolated build - rebuild ONLY dashboard
  node scripts/build_rspack_bundles.js --plugins=dashboard --dist

  # Build multiple isolated plugins
  node scripts/build_rspack_bundles.js --plugins=discover,dashboard --dist

  # Build external plugin
  node scripts/build_rspack_bundles.js --plugins=my_custom_plugin --dist

  # Fastest full build (no isolated support)
  node scripts/build_rspack_bundles.js --single --dist
`);
}
