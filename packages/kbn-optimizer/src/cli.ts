/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { lastValueFrom } from 'rxjs';
import { run, createFlagError, Flags } from '@kbn/dev-utils';

import { logOptimizerState } from './log_optimizer_state';
import { logOptimizerProgress } from './log_optimizer_progress';
import { OptimizerConfig } from './optimizer';
import { runOptimizer } from './run_optimizer';
import { validateLimitsForAllBundles, updateBundleLimits } from './limits';
import { reportOptimizerTimings } from './report_optimizer_timings';

function getLimitsPath(flags: Flags, defaultPath: string) {
  if (flags.limits) {
    if (typeof flags.limits !== 'string') {
      throw createFlagError('expected --limits to be a string');
    }

    return Path.resolve(flags.limits);
  }

  if (process.env.KBN_OPTIMIZER_LIMITS_PATH) {
    return Path.resolve(process.env.KBN_OPTIMIZER_LIMITS_PATH);
  }

  return defaultPath;
}

export function runKbnOptimizerCli(options: { defaultLimitsPath: string }) {
  run(
    async ({ log, flags }) => {
      const watch = flags.watch ?? false;
      if (typeof watch !== 'boolean') {
        throw createFlagError('expected --watch to have no value');
      }

      const oss = flags.oss ?? false;
      if (typeof oss !== 'boolean') {
        throw createFlagError('expected --oss to have no value');
      }

      const cache = flags.cache ?? true;
      if (typeof cache !== 'boolean') {
        throw createFlagError('expected --cache to have no value');
      }

      const includeCoreBundle = flags.core ?? true;
      if (typeof includeCoreBundle !== 'boolean') {
        throw createFlagError('expected --core to have no value');
      }

      const dist = flags.dist ?? false;
      if (typeof dist !== 'boolean') {
        throw createFlagError('expected --dist to have no value');
      }

      const examples = flags.examples ?? false;
      if (typeof examples !== 'boolean') {
        throw createFlagError('expected --no-examples to have no value');
      }

      const profileWebpack = flags.profile ?? false;
      if (typeof profileWebpack !== 'boolean') {
        throw createFlagError('expected --profile to have no value');
      }

      const inspectWorkers = flags['inspect-workers'] ?? false;
      if (typeof inspectWorkers !== 'boolean') {
        throw createFlagError('expected --no-inspect-workers to have no value');
      }

      const maxWorkerCount = flags.workers ? Number.parseInt(String(flags.workers), 10) : undefined;
      if (
        maxWorkerCount !== undefined &&
        (!Number.isFinite(maxWorkerCount) || maxWorkerCount < 1)
      ) {
        throw createFlagError('expected --workers to be a number greater than 0');
      }

      const extraPluginScanDirs = ([] as string[])
        .concat((flags['scan-dir'] as string | string[]) || [])
        .map((p) => Path.resolve(p));
      if (!extraPluginScanDirs.every((s) => typeof s === 'string')) {
        throw createFlagError('expected --scan-dir to be a string');
      }

      const reportStats = flags['report-stats'] ?? false;
      if (typeof reportStats !== 'boolean') {
        throw createFlagError('expected --report-stats to have no value');
      }

      const logProgress = flags.progress ?? false;
      if (typeof logProgress !== 'boolean') {
        throw createFlagError('expected --progress to have no value');
      }

      const filter = typeof flags.filter === 'string' ? [flags.filter] : flags.filter;
      if (!Array.isArray(filter) || !filter.every((f) => typeof f === 'string')) {
        throw createFlagError('expected --filter to be one or more strings');
      }

      const focus = typeof flags.focus === 'string' ? [flags.focus] : flags.focus;
      if (!Array.isArray(focus) || !focus.every((f) => typeof f === 'string')) {
        throw createFlagError('expected --focus to be one or more strings');
      }

      const limitsPath = getLimitsPath(flags, options.defaultLimitsPath);

      const validateLimits = flags['validate-limits'] ?? false;
      if (typeof validateLimits !== 'boolean') {
        throw createFlagError('expected --validate-limits to have no value');
      }

      const updateLimits = flags['update-limits'] ?? false;
      if (typeof updateLimits !== 'boolean') {
        throw createFlagError('expected --update-limits to have no value');
      }

      const config = OptimizerConfig.create({
        repoRoot: REPO_ROOT,
        watch,
        maxWorkerCount,
        oss: oss && !(validateLimits || updateLimits),
        dist: dist || updateLimits,
        cache,
        examples: examples && !(validateLimits || updateLimits),
        profileWebpack,
        extraPluginScanDirs,
        inspectWorkers,
        includeCoreBundle,
        filter,
        focus,
        limitsPath,
      });

      if (validateLimits) {
        validateLimitsForAllBundles(log, config, limitsPath);
        return;
      }

      const update$ = runOptimizer(config);

      await lastValueFrom(
        update$.pipe(
          logProgress ? logOptimizerProgress(log) : (x) => x,
          logOptimizerState(log, config),
          reportOptimizerTimings(log, config)
        )
      );

      if (updateLimits) {
        updateBundleLimits({
          log,
          config,
          dropMissing: !(focus || filter),
          limitsPath,
        });
      }
    },
    {
      flags: {
        boolean: [
          'core',
          'watch',
          'oss',
          'examples',
          'dist',
          'cache',
          'profile',
          'inspect-workers',
          'validate-limits',
          'update-limits',
          'progress',
        ],
        string: ['workers', 'scan-dir', 'filter', 'limits'],
        default: {
          core: true,
          examples: true,
          cache: true,
          'inspect-workers': true,
          progress: true,
          filter: [],
          focus: [],
        },
        help: `
          --watch            run the optimizer in watch mode
          --workers          max number of workers to use
          --no-progress      disable logging of progress information
          --oss              only build oss plugins
          --profile          profile the webpack builds and write stats.json files to build outputs
          --no-core          disable generating the core bundle
          --no-cache         disable the cache
          --focus            just like --filter, except dependencies are automatically included, --filter applies to result
          --filter           comma-separated list of bundle id filters, results from multiple flags are merged, * and ! are supported
          --no-examples      don't build the example plugins
          --dist             create bundles that are suitable for inclusion in the Kibana distributable, enabled when running with --update-limits
          --scan-dir         add a directory to the list of directories scanned for plugins (specify as many times as necessary)
          --no-inspect-workers  when inspecting the parent process, don't inspect the workers
          --limits           path to a limits.yml file to read, defaults to $KBN_OPTIMIZER_LIMITS_PATH or source file
          --validate-limits  validate the limits.yml config to ensure that there are limits defined for every bundle
          --update-limits    run a build and rewrite the limits file to include the current bundle sizes +15kb
        `,
      },
    }
  );
}
