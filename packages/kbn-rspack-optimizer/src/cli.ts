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
import { parseThemeTags } from '@kbn/core-ui-settings-common';
import { runBuild } from './run_build';
import { validateLimitsForAllBundles, updateBundleLimits, DEFAULT_LIMITS_PATH } from './limits';
import { resolveBundlesDir, METRICS_FILENAME } from './paths';
import { discoverPlugins } from './utils/plugin_discovery';
import { getInspectExecArgv } from './utils/inspect';

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

      // cache and hmr are declared as positive booleans defaulting to true.
      // getopts interprets --no-cache as cache=false and --no-hmr as hmr=false.
      const cache = flags.cache as boolean;
      const hmr = flags.hmr as boolean;

      const profile = flags.profile ?? false;
      if (typeof profile !== 'boolean') {
        throw createFlagError('expected --profile to have no value');
      }

      const profileStatsOnly = flags['profile-stats-only'] ?? false;
      if (typeof profileStatsOnly !== 'boolean') {
        throw createFlagError('expected --profile-stats-only to have no value');
      }

      const profileFocus =
        typeof flags['profile-focus'] === 'string' && flags['profile-focus'].length > 0
          ? flags['profile-focus'].split(',').map((s: string) => s.trim())
          : undefined;

      if (profileFocus && !profile && !profileStatsOnly) {
        throw createFlagError('--profile-focus requires --profile or --profile-stats-only');
      }

      const updateLimits = flags['update-limits'] ?? false;
      if (typeof updateLimits !== 'boolean') {
        throw createFlagError('expected --update-limits to have no value');
      }

      const validateLimits = flags['validate-limits'] ?? false;
      if (typeof validateLimits !== 'boolean') {
        throw createFlagError('expected --validate-limits to have no value');
      }

      const modes = [
        validateLimits && '--validate-limits',
        (profile || profileStatsOnly) && (profile ? '--profile' : '--profile-stats-only'),
        updateLimits && '--update-limits',
      ].filter(Boolean);

      if (modes.length > 1) {
        throw createFlagError(`${modes.join(' and ')} cannot be used together`);
      }

      const limitsPath =
        typeof flags.limits === 'string' && flags.limits.length > 0
          ? Path.resolve(flags.limits)
          : options.defaultLimitsPath ?? DEFAULT_LIMITS_PATH;

      // --validate-limits: quick check, no build needed
      if (validateLimits) {
        const allPlugins = await discoverPlugins({
          repoRoot: REPO_ROOT,
          examples: false,
          testPlugins: false,
        });
        const pluginIds = ['core', ...allPlugins.filter((p) => !p.ignoreMetrics).map((p) => p.id)];
        validateLimitsForAllBundles(log, pluginIds, limitsPath);
        return;
      }

      const themes = [
        ...parseThemeTags(typeof flags.themes === 'string' ? flags.themes : undefined),
      ];

      const outputRoot =
        typeof flags['output-root'] === 'string' && flags['output-root'].length > 0
          ? Path.resolve(flags['output-root'])
          : REPO_ROOT;

      const inspectWorkers = flags['inspect-workers'] as boolean;

      // When profiling, spawn a special worker that doesn't use require-in-the-middle
      // This allows RsDoctor to work (envinfo conflicts with require-in-the-middle)
      if (profile || profileStatsOnly) {
        if (watch) {
          log.info('Note: --watch is ignored in profile mode (profile builds are always one-time)');
        }
        await runProfileWorker(log, addCleanupTask, profileStatsOnly, inspectWorkers);
        return;
      }

      const startTime = Date.now();

      if (updateLimits && !dist) {
        log.info('--update-limits implies --dist (full production build)');
      }

      const effectiveDist = updateLimits || dist;
      const effectiveExamples = updateLimits ? false : examples;
      const effectiveTestPlugins = updateLimits ? false : testPlugins;

      log.info('Building with RSPack unified compilation...');

      const result = await runBuild({
        repoRoot: REPO_ROOT,
        outputRoot,
        watch: updateLimits ? false : watch,
        dist: effectiveDist,
        cache,
        examples: effectiveExamples,
        testPlugins: effectiveTestPlugins,
        themeTags: themes,
        log,
        profile: false,
        hmr: hmr ? undefined : false,
        limitsPath,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        log.success(`RSPack build completed in ${duration}s`);
      } else {
        throw new Error(`RSPack build failed after ${duration}s`);
      }

      if (updateLimits) {
        const metricsPath = Path.resolve(resolveBundlesDir(outputRoot), METRICS_FILENAME);
        updateBundleLimits(log, metricsPath, limitsPath);
      }

      await result.done;
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
          'cache',
          'hmr',
          'profile',
          'profile-stats-only',
          'update-limits',
          'validate-limits',
          'inspect-workers',
        ],
        string: ['themes', 'output-root', 'limits', 'profile-focus'],
        alias: {
          w: 'watch',
        },
        default: {
          watch: false,
          dist: false,
          examples: false,
          'test-plugins': false,
          cache: true,
          hmr: true,
          profile: false,
          'profile-stats-only': false,
          'inspect-workers': true,
        },
        help: `
          Build Options:
            --watch, -w               Enable watch mode for development
            --dist                    Build for distribution (minified, no source maps)
            --examples                Include example plugins
            --test-plugins            Include test plugins
            --themes <tags>           Comma-separated theme tags to build (default: all)
            --output-root <dir>       Output root directory (default: repo root)
            --no-cache                Disable filesystem caching
            --no-hmr                  Disable Hot Module Replacement in watch mode

          Debugging:
            --no-inspect-workers      Don't forward --inspect to worker processes (default: forward)

          Bundle Limits:
            --update-limits           Build in dist mode and update limits.yml (always full build)
            --validate-limits         Validate limits.yml against discovered plugins (no build)
            --limits <path>           Override limits.yml path (default: packages/kbn-rspack-optimizer/limits.yml)

          Profile Mode (one-time build with bundle analysis):
            --profile                 Full profiling with stats.json + RsDoctor report
            --profile-stats-only      Fast profiling with stats.json only (skips RsDoctor)
            --profile-focus <ids>     Comma-separated plugin IDs for focused stats.json with module detail
                                      Note: --watch is ignored in profile mode

          Environment Variables:
            KBN_USE_RSPACK=true       Use RSPack optimizer instead of webpack
            KBN_HMR=false             Disable HMR (RSPack only, alternative to --no-hmr)
            KBN_HMR_PORT=5678         Override the HMR SSE server port (RSPack only, default: 5678)
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

          # Validate limits.yml (CI check, no build)
          node scripts/build_rspack_bundles.js --validate-limits

          # Update limits.yml (always runs a full dist build)
          node scripts/build_rspack_bundles.js --update-limits
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
  statsOnly: boolean = false,
  inspectWorkers: boolean = true
): Promise<void> {
  return new Promise((resolve, reject) => {
    const workerPath = Path.resolve(__dirname, '../scripts/profile_worker.js');

    log.write('');
    log.info(`Starting RSPack profiler${statsOnly ? ' (stats only)' : ''}...`);
    log.write('');

    // Forward args to worker, stripping flags the worker doesn't understand
    const stripFromWorker = new Set([
      '--profile',
      '--profile-stats-only',
      '--update-limits',
      '--validate-limits',
      '--watch',
      '-w',
      '--no-hmr',
      '--no-inspect-workers',
    ]);
    const rawArgs = process.argv.slice(2);
    const workerArgs: string[] = [];
    for (let i = 0; i < rawArgs.length; i++) {
      if (stripFromWorker.has(rawArgs[i])) continue;
      workerArgs.push(rawArgs[i]);
    }

    let child: ChildProcess | undefined;

    child = fork(workerPath, workerArgs, {
      stdio: 'inherit',
      execArgv: ['--max-old-space-size=8192', ...getInspectExecArgv(inspectWorkers)],
      env: {
        ...process.env,
        ELASTIC_APM_ACTIVE: 'false',
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
