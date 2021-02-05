/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { CiStatsMetrics } from '@kbn/dev-utils';
import { OptimizerConfig } from './optimizer_config';

export function getMetrics(config: OptimizerConfig): CiStatsMetrics {
  return config.bundles
    .map((bundle) =>
      JSON.parse(Fs.readFileSync(Path.resolve(bundle.outputDir, 'metrics.json'), 'utf-8'))
    )
    .flat();
}
