/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { materialize, mergeMap, dematerialize } from 'rxjs/operators';
import { CiStatsReporter, ToolingLog } from '@kbn/dev-utils';

import { OptimizerUpdate$ } from './run_optimizer';
import { OptimizerConfig, getMetrics } from './optimizer';
import { pipeClosure } from './common';

export function reportOptimizerStats(
  reporter: CiStatsReporter,
  config: OptimizerConfig,
  log: ToolingLog
) {
  return pipeClosure((update$: OptimizerUpdate$) =>
    update$.pipe(
      materialize(),
      mergeMap(async (n) => {
        if (n.kind === 'C') {
          const metrics = getMetrics(log, config);

          await reporter.metrics(metrics);

          for (const metric of metrics) {
            if (metric.limit != null && metric.value > metric.limit) {
              const value = metric.value.toLocaleString();
              const limit = metric.limit.toLocaleString();
              log.warning(
                `Metric [${metric.group}] for [${metric.id}] of [${value}] over the limit of [${limit}]`
              );
            }
          }
        }

        return n;
      }),
      dematerialize()
    )
  );
}
