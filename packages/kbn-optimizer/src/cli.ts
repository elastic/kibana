/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import 'source-map-support/register';

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { lastValueFrom } from '@kbn/std';
import { run, createFlagError, CiStatsReporter } from '@kbn/dev-utils';

import { logOptimizerState } from './log_optimizer_state';
import { OptimizerConfig } from './optimizer';
import { reportOptimizerStats } from './report_optimizer_stats';
import { runOptimizer } from './run_optimizer';
import { validateLimitsForAllBundles, updateBundleLimits } from './limits';

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
    if (maxWorkerCount !== undefined && (!Number.isFinite(maxWorkerCount) || maxWorkerCount < 1)) {
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

    const filter = typeof flags.filter === 'string' ? [flags.filter] : flags.filter;
    if (!Array.isArray(filter) || !filter.every((f) => typeof f === 'string')) {
      throw createFlagError('expected --filter to be one or more strings');
    }

    const focus = typeof flags.focus === 'string' ? [flags.focus] : flags.focus;
    if (!Array.isArray(focus) || !focus.every((f) => typeof f === 'string')) {
      throw createFlagError('expected --focus to be one or more strings');
    }

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
    });

    if (validateLimits) {
      validateLimitsForAllBundles(log, config);
      return;
    }

    let update$ = runOptimizer(config);

    if (reportStats) {
      const reporter = CiStatsReporter.fromEnv(log);

      if (!reporter.isEnabled()) {
        log.warning('Unable to initialize CiStatsReporter from env');
      }

      update$ = update$.pipe(reportOptimizerStats(reporter, config, log));
    }

    await lastValueFrom(update$.pipe(logOptimizerState(log, config)));

    if (updateLimits) {
      updateBundleLimits({
        log,
        config,
        dropMissing: !(focus || filter),
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
        'report-stats',
        'validate-limits',
        'update-limits',
      ],
      string: ['workers', 'scan-dir', 'filter'],
      default: {
        core: true,
        examples: true,
        cache: true,
        'inspect-workers': true,
        filter: [],
        focus: [],
      },
      help: `
        --watch            run the optimizer in watch mode
        --workers          max number of workers to use
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
        --report-stats     attempt to report stats about this execution of the build to the kibana-ci-stats service using this name
        --validate-limits  validate the limits.yml config to ensure that there are limits defined for every bundle
        --update-limits    run a build and rewrite the limits file to include the current bundle sizes +5kb
      `,
    },
  }
);
