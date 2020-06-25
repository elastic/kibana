/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import 'source-map-support/register';

import Path from 'path';

import { run, REPO_ROOT, createFlagError, CiStatsReporter } from '@kbn/dev-utils';

import { logOptimizerState } from './log_optimizer_state';
import { OptimizerConfig } from './optimizer';
import { reportOptimizerStats } from './report_optimizer_stats';
import { runOptimizer } from './run_optimizer';

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

    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
      watch,
      maxWorkerCount,
      oss,
      dist,
      cache,
      examples,
      profileWebpack,
      extraPluginScanDirs,
      inspectWorkers,
      includeCoreBundle,
    });

    let update$ = runOptimizer(config);

    if (reportStats) {
      const reporter = CiStatsReporter.fromEnv(log);

      if (!reporter.isEnabled()) {
        log.warning('Unable to initialize CiStatsReporter from env');
      }

      update$ = update$.pipe(reportOptimizerStats(reporter, config));
    }

    await update$.pipe(logOptimizerState(log, config)).toPromise();
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
      ],
      string: ['workers', 'scan-dir'],
      default: {
        core: true,
        examples: true,
        cache: true,
        'inspect-workers': true,
      },
      help: `
        --watch            run the optimizer in watch mode
        --workers          max number of workers to use
        --oss              only build oss plugins
        --profile          profile the webpack builds and write stats.json files to build outputs
        --no-core          disable generating the core bundle
        --no-cache         disable the cache
        --no-examples      don't build the example plugins
        --dist             create bundles that are suitable for inclusion in the Kibana distributable
        --scan-dir         add a directory to the list of directories scanned for plugins (specify as many times as necessary)
        --no-inspect-workers  when inspecting the parent process, don't inspect the workers
        --report-stats     attempt to report stats about this execution of the build to the kibana-ci-stats service using this name
      `,
    },
  }
);
