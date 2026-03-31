/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { fork, type ChildProcess } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import { runBuild } from './run_build';
import type { ThemeTag } from './types';

export interface CliOptions {
  defaultLimitsPath?: string;
}

/**
 * Run the RSPack optimizer CLI
 */
export function runRspackCli(options: CliOptions = {}): void {
  run(
    async ({ log, flags, addCleanupTask }) => {
      const watch = flags.watch ?? false;
      if (typeof watch !== 'boolean') {
        throw createFlagError('expected --watch to have no value');
      }

      const dist = flags.dist ?? false;
      if (typeof dist !== 'boolean') {
        throw createFlagError('expected --dist to have no value');
      }

      const examples = flags.examples ?? false;
      if (typeof examples !== 'boolean') {
        throw createFlagError('expected --examples to have no value');
      }

      const testPlugins = flags['test-plugins'] ?? false;
      if (typeof testPlugins !== 'boolean') {
        throw createFlagError('expected --test-plugins to have no value');
      }

      const noCache = flags['no-cache'] ?? false;
      if (typeof noCache !== 'boolean') {
        throw createFlagError('expected --no-cache to have no value');
      }

      const noHmr = flags['no-hmr'] ?? false;
      if (typeof noHmr !== 'boolean') {
        throw createFlagError('expected --no-hmr to have no value');
      }

      const profile = flags.profile ?? false;
      if (typeof profile !== 'boolean') {
        throw createFlagError('expected --profile to have no value');
      }

      const profileStatsOnly = flags['profile-stats-only'] ?? false;
      if (typeof profileStatsOnly !== 'boolean') {
        throw createFlagError('expected --profile-stats-only to have no value');
      }

      const filter =
        typeof flags.filter === 'string'
          ? flags.filter.split(',').map((s: string) => s.trim())
          : undefined;

      const plugins =
        typeof flags.plugins === 'string'
          ? flags.plugins.split(',').map((s: string) => s.trim())
          : undefined;

      const themes = parseThemes(log, typeof flags.themes === 'string' ? flags.themes : undefined);

      const outputRoot =
        typeof flags['output-root'] === 'string' ? Path.resolve(flags['output-root']) : REPO_ROOT;

      // When profiling, spawn a special worker that doesn't use require-in-the-middle
      // This allows RsDoctor to work (envinfo conflicts with require-in-the-middle)
      if (profile || profileStatsOnly) {
        if (watch) {
          log.info('Note: --watch is ignored in profile mode (profile builds are always one-time)');
        }
        await runProfileWorker(log, addCleanupTask, profileStatsOnly);
        return;
      }

      const startTime = Date.now();

      log.info('Building with RSPack unified compilation...');

      const result = await runBuild({
        repoRoot: REPO_ROOT,
        outputRoot,
        watch,
        dist,
        cache: !noCache,
        examples,
        testPlugins,
        themeTags: themes,
        filter,
        plugins,
        log,
        profile: false,
        hmr: noHmr ? false : undefined,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        log.success(`RSPack build completed in ${duration}s`);
      } else {
        throw new Error(`RSPack build failed after ${duration}s`);
      }
    },
    {
      usage: 'node scripts/build_rspack_bundles.js [options]',
      description: 'RSPack Optimizer - Build Kibana platform plugin bundles',
      flags: {
        boolean: [
          'watch',
          'dist',
          'examples',
          'test-plugins',
          'no-cache',
          'no-hmr',
          'profile',
          'profile-stats-only',
        ],
        string: ['filter', 'themes', 'output-root', 'plugins'],
        alias: {
          w: 'watch',
          p: 'plugins',
        },
        default: {
          watch: false,
          dist: false,
          examples: false,
          'test-plugins': false,
          'no-cache': false,
          'no-hmr': false,
          profile: false,
          'profile-stats-only': false,
        },
        help: `
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
            --no-hmr              Disable Hot Module Replacement in watch mode

          Profile Mode (one-time build with bundle analysis):
            --profile             Full profiling with stats.json + RsDoctor report
            --profile-stats-only  Fast profiling with stats.json only (skips RsDoctor)
                                  Note: --watch is ignored in profile mode

          Environment Variables:
            KBN_USE_RSPACK=true   Use RSPack optimizer instead of webpack
            KBN_HMR=false         Disable HMR (RSPack only, alternative to --no-hmr)
            KBN_HMR_PORT=5678     Override the HMR SSE server port (RSPack only, default: 5678)
        `,
        examples: `
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
        `,
      },
    }
  );
}

/**
 * Run the profile build in a separate worker process.
 *
 * The worker uses a minimal Node.js setup that avoids require-in-the-middle
 * (from @kbn/setup-node-env/harden), which conflicts with envinfo used by RsDoctor.
 */
function runProfileWorker(
  log: ToolingLog,
  addCleanupTask: (task: () => void) => void,
  statsOnly: boolean = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    const workerPath = Path.resolve(__dirname, '../scripts/profile_worker.js');

    log.write('');
    log.info(`Starting RSPack profiler${statsOnly ? ' (stats only)' : ''}...`);
    log.write('');

    // Forward args to worker, excluding --profile flags (worker handles them via env)
    const rawArgs = process.argv.slice(2);
    const workerArgs = rawArgs.filter(
      (arg) => arg !== '--profile' && arg !== '--profile-stats-only'
    );

    let child: ChildProcess | undefined;

    child = fork(workerPath, workerArgs, {
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

    addCleanupTask(() => {
      if (child && !child.killed) {
        child.kill();
      }
    });

    child.on('exit', (code) => {
      child = undefined;
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Profile worker exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      child = undefined;
      reject(err);
    });
  });
}

function parseThemes(log: ToolingLog, themesArg: string | undefined): ThemeTag[] {
  if (!themesArg || themesArg === '*') {
    return ['borealislight', 'borealisdark'];
  }

  const themes = themesArg.split(',').map((s) => s.trim()) as ThemeTag[];
  const valid: ThemeTag[] = ['borealislight', 'borealisdark'];

  for (const theme of themes) {
    if (!valid.includes(theme)) {
      log.warning(`Unknown theme "${theme}", valid themes are: ${valid.join(', ')}`);
    }
  }

  return themes.filter((t) => valid.includes(t));
}
