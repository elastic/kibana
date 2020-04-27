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
import { CiStatsReporter } from '@kbn/dev-utils';

import { OptimizerUpdate$ } from './run_optimizer';
import { OptimizerState } from './optimizer';
import { pipeClosure } from './common';

export function reportOptimizerStats(reporter: CiStatsReporter, name: string) {
  return pipeClosure((update$: OptimizerUpdate$) => {
    let lastState: OptimizerState | undefined;
    return update$.pipe(
      materialize(),
      mergeMap(async n => {
        if (n.kind === 'N' && n.value?.state) {
          lastState = n.value?.state;
        }

        if (n.kind === 'C' && lastState) {
          await reporter.metric('@kbn/optimizer build time', name, lastState.durSec);
        }

        return n;
      }),
      dematerialize()
    );
  });
}
