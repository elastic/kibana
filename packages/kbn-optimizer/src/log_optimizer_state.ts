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

import { inspect } from 'util';

import { ToolingLog } from '@kbn/dev-utils';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';

import { OptimizerConfig } from './optimizer_config';
import { OptimizerStateSummary } from './optimizer';
import { CompilerState, pipeClosure } from './common';

export function logOptimizerState(log: ToolingLog, config: OptimizerConfig) {
  return pipeClosure((state$: Rx.Observable<OptimizerStateSummary>) => {
    const bundleStates = new Map<string, CompilerState['type']>();

    return state$.pipe(
      tap(s => {
        if (s.event?.type === 'worker stdio') {
          const chunk = s.event.chunk.toString('utf8');
          log.warning(
            '⚙️  worker',
            s.event.stream,
            chunk.slice(0, chunk.length - (chunk.endsWith('\n') ? 1 : 0))
          );
          return;
        }

        if (s.event?.type === 'worker started') {
          log.debug(`worker started for bundles ${s.event.bundles.map(b => b.id).join(', ')}`);
          return;
        }

        if (s.event?.type === 'changes detected') {
          log.debug(`changes detected...`);
          return;
        }

        if (s.summary === 'initialized') {
          log.debug(`initialized after ${s.durSec} sec`);
          log.debug(`  version: ${s.version}`);
          log.debug(`  cached: ${s.offlineBundles.map(b => b.id)}`);
          return;
        }

        for (const { bundleId: id, type } of s.compilerStates) {
          const prevBundleState = bundleStates.get(id);

          if (type === prevBundleState) {
            continue;
          }

          bundleStates.set(id, type);
          log.debug(
            `[${id}] state = "${type}"${type !== 'running' ? ` after ${s.durSec} sec` : ''}`
          );
        }

        if (s.summary === 'running') {
          return true;
        }

        if (s.summary === 'issue') {
          log.error('⚙️  webpack compile errors');
          log.indent(4);
          for (const b of s.compilerStates) {
            if (b.type === 'compiler issue') {
              log.error(`[${b.bundleId}] build`);
              log.indent(4);
              log.error(b.failure);
              log.indent(-4);
            }
          }
          log.indent(-4);
          return true;
        }

        if (s.summary === 'success') {
          log.success(
            config.watch
              ? `⚙️  watching for changes in all bundles after ${s.durSec} sec`
              : `⚙️  all bundles compiled successfully after ${s.durSec} sec`
          );
          return true;
        }

        throw new Error(`unhandled optimizer state: ${inspect(s)}`);
      })
    );
  });
}
