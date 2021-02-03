/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { CiStatsReporter } from '@kbn/dev-utils';
import {
  runOptimizer,
  OptimizerConfig,
  logOptimizerState,
  reportOptimizerStats,
} from '@kbn/optimizer';

import { Task } from '../lib';

export const BuildKibanaPlatformPlugins: Task = {
  description: 'Building distributable versions of Kibana platform plugins',
  async run(_, log, build) {
    const config = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
      outputRoot: build.resolvePath(),
      cache: false,
      oss: build.isOss(),
      examples: false,
      watch: false,
      dist: true,
      includeCoreBundle: true,
    });

    const reporter = CiStatsReporter.fromEnv(log);

    await runOptimizer(config)
      .pipe(reportOptimizerStats(reporter, config, log), logOptimizerState(log, config))
      .toPromise();

    await Promise.all(config.bundles.map((b) => b.cache.clear()));
  },
};
