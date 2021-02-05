/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { lastValueFrom } from '@kbn/std';
import { runOptimizer, OptimizerConfig, logOptimizerState, getMetrics } from '@kbn/optimizer';

import { Task, write } from '../lib';

export const BuildKibanaPlatformPlugins: Task = {
  description: 'Building distributable versions of Kibana platform plugins',
  async run(buildConfig, log, build) {
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

    await lastValueFrom(runOptimizer(config).pipe(logOptimizerState(log, config)));
    await write(
      buildConfig.resolveFromTarget('optimizer_bundle_metrics.json'),
      JSON.stringify(getMetrics(config), null, 2)
    );

    await Promise.all(config.bundles.map((b) => b.cache.clear()));
  },
};
