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
