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
import { CiStatsMetric } from '@kbn/ci-stats-reporter';
import {
  runOptimizer,
  OptimizerConfig,
  logOptimizerState,
  reportOptimizerTimings,
} from '@kbn/optimizer';

import { Task, deleteAll, write, read } from '../lib';

export const BuildKibanaPlatformPlugins: Task = {
  description: 'Building distributable versions of Kibana platform plugins',
  async run(buildConfig, log, build) {
    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
      outputRoot: build.resolvePath(),
      cache: false,
      examples: false,
      watch: false,
      dist: true,
      includeCoreBundle: true,
      limitsPath: Path.resolve(REPO_ROOT, 'packages/kbn-optimizer/limits.yml'),
    });

    await lastValueFrom(
      runOptimizer(config).pipe(logOptimizerState(log, config), reportOptimizerTimings(log, config))
    );

    const combinedMetrics: CiStatsMetric[] = [];
    const metricFilePaths: string[] = [];
    for (const bundle of config.bundles) {
      const path = Path.resolve(bundle.outputDir, 'metrics.json');
      const metrics: CiStatsMetric[] = JSON.parse(await read(path));
      combinedMetrics.push(...metrics);
      metricFilePaths.push(path);
    }

    // write combined metrics to target
    await write(
      buildConfig.resolveFromTarget('optimizer_bundle_metrics.json'),
      JSON.stringify(combinedMetrics, null, 2)
    );

    // delete all metric files
    await deleteAll(metricFilePaths, log);

    // delete all bundle cache files
    await Promise.all(config.bundles.map((b) => b.cache.clear()));
  },
};
