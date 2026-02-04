/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { fork } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog, pickLevelFromFlags } from '@kbn/tooling-log';
import getopts from 'getopts';
import { runHybridBuild } from './run_hybrid_build';
import type { ThemeTag } from './types';

export interface CliOptions {
  defaultLimitsPath?: string;
}

/**
 * Run the RSPack optimizer CLI
 */
export async function runRspackCli(options: CliOptions = {}): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const args = getopts(rawArgs, {
    boolean: [
      'watch',
      'dist',
      'examples',
      'test-plugins',
      'help',
      'no-cache',
      'verbose',
      'quiet',
      'profile',
      'profile-stats-only',
    ],
    string: ['filter', 'themes', 'output-root', 'plugins'],
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
      'no-cache': false,
      profile: false,
      'profile-stats-only': false,
    },
  });

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // When profiling, spawn a special worker that doesn't use require-in-the-middle
  // This allows RsDoctor to work (envinfo conflicts with require-in-the-middle)
  if (args.profile || args['profile-stats-only']) {
    if (args.watch) {
      // eslint-disable-next-line no-console
      console.log('Note: --watch is ignored in profile mode (profile builds are always one-time)');
    }
    return runProfileWorker(rawArgs, args['profile-stats-only']);
  }

  const log = new ToolingLog({
    level: pickLevelFromFlags({
      verbose: args.verbose,
      quiet: args.quiet,
    }),
    writeTo: process.stdout,
  });

  const filter = args.filter ? args.filter.split(',').map((s: string) => s.trim()) : undefined;
  const plugins = args.plugins ? args.plugins.split(',').map((s: string) => s.trim()) : undefined;
  const themes = parseThemes(args.themes);

  try {
    const startTime = Date.now();

    log.info('Building with RSPack unified compilation...');

    const result = await runHybridBuild({
      repoRoot: REPO_ROOT,
      outputRoot: args['output-root'] ? Path.resolve(args['output-root']) : REPO_ROOT,
      watch: args.watch,
      dist: args.dist,
      cache: !args['no-cache'],
      examples: args.examples,
      testPlugins: args['test-plugins'],
      themeTags: themes,
      filter,
      plugins,
      log,
      profile: false,
    });

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
    log.error(`RSPack optimizer failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Run the profile build in a separate worker process.
 *
 * The worker uses a minimal Node.js setup that avoids require-in-the-middle
 * (from @kbn/setup-node-env/harden), which conflicts with envinfo used by RsDoctor.
 */
function runProfileWorker(args: string[], statsOnly: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const workerPath = Path.resolve(__dirname, '../scripts/profile_worker.js');

    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(`Starting RSPack profiler${statsOnly ? ' (stats only)' : ''}...`);
    // eslint-disable-next-line no-console
    console.log('');

    // Forward args to worker, excluding --profile flags (worker handles them via env)
    const workerArgs = args.filter(
      (arg) => arg !== '--profile' && arg !== '--profile-stats-only'
    );

    const child = fork(workerPath, workerArgs, {
      stdio: 'inherit',
      // Increase memory for profiling - stats generation needs significant heap
      execArgv: ['--max-old-space-size=8192'],
      env: {
        ...process.env,
        // Ensure APM doesn't interfere
        ELASTIC_APM_ACTIVE: 'false',
        // Pass stats-only mode to worker
        RSPACK_PROFILE_STATS_ONLY: statsOnly ? 'true' : 'false',
      },
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Profile worker exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

function parseThemes(themesArg: string | undefined): ThemeTag[] {
  if (!themesArg || themesArg === '*') {
    return ['borealislight', 'borealisdark'];
  }

  const themes = themesArg.split(',').map((s) => s.trim()) as ThemeTag[];
  const valid: ThemeTag[] = ['borealislight', 'borealisdark'];

  for (const theme of themes) {
    if (!valid.includes(theme)) {
      // eslint-disable-next-line no-console
      console.warn(`Warning: Unknown theme "${theme}", valid themes are: ${valid.join(', ')}`);
    }
  }

  return themes.filter((t) => valid.includes(t));
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
RSPack Optimizer - Build Kibana platform plugin bundles

Usage:
  node scripts/build_rspack_bundles.js [options]

Build Options:
  --watch, -w           Enable watch mode for development
  --dist                Build for distribution (minified, no source maps)
  --examples            Include example plugins
  --test-plugins        Include test plugins
  --filter <ids>        Comma-separated plugin IDs to exclude
  --plugins, -p <ids>   Build only these plugins (for external plugins)
  --themes <tags>       Comma-separated theme tags to build (default: all)
  --output-root <dir>   Output root directory (default: repo root)
  --no-cache            Disable filesystem caching

Profile Mode (one-time build with bundle analysis):
  --profile             Full profiling with stats.json + RsDoctor report
  --profile-stats-only  Fast profiling with stats.json only (skips RsDoctor)
                        Note: --watch is ignored in profile mode

Output Options:
  --verbose             Verbose output
  --quiet               Quiet output
  --help, -h            Show this help message

Environment Variables:
  KBN_USE_RSPACK=true   Use RSPack optimizer instead of webpack

Examples:
  # Full production build
  node scripts/build_rspack_bundles.js --dist

  # Development with watch mode
  node scripts/build_rspack_bundles.js --watch

  # Profile with full analysis (stats.json + RsDoctor)
  node scripts/build_rspack_bundles.js --profile

  # Quick profile (stats.json only, faster)
  node scripts/build_rspack_bundles.js --profile-stats-only

  # Profile production build
  node scripts/build_rspack_bundles.js --dist --profile
`);
}
