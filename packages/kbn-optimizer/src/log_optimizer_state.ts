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
import { OptimizerMsg } from './optimizer';
import { CompilerState, pipeClosure } from './common';

export function logOptimizerState(log: ToolingLog, config: OptimizerConfig) {
  return pipeClosure((msg$: Rx.Observable<OptimizerMsg>) => {
    const bundleStates = new Map<string, CompilerState['type']>();
    let loggedInit = false;

    return msg$.pipe(
      tap(msg => {
        const { event, state } = msg;

        if (state.phase === 'initialized' && !loggedInit) {
          loggedInit = true;
          log.debug(`initialized after ${state.durSec} sec`);
          log.debug(`  version: ${state.version}`);
          log.debug(`  cached: ${state.offlineBundles.map(b => b.id)}`);
        }

        if (event?.type === 'worker stdio') {
          const chunk = event.chunk.toString('utf8');
          log.warning(
            '⚙️  worker',
            event.stream,
            chunk.slice(0, chunk.length - (chunk.endsWith('\n') ? 1 : 0))
          );
          return;
        }

        if (event?.type === 'worker started') {
          log.debug(`worker started for bundles ${event.bundles.map(b => b.id).join(', ')}`);
          return;
        }

        if (event?.type === 'changes detected') {
          log.debug(`changes detected...`);
          return;
        }

        for (const { bundleId: id, type } of state.compilerStates) {
          const prevBundleState = bundleStates.get(id);

          if (type === prevBundleState) {
            continue;
          }

          bundleStates.set(id, type);
          log.debug(
            `[${id}] state = "${type}"${type !== 'running' ? ` after ${state.durSec} sec` : ''}`
          );
        }

        if (state.phase === 'running') {
          return true;
        }

        if (state.phase === 'issue') {
          log.error('⚙️  webpack compile errors');
          log.indent(4);
          for (const b of state.compilerStates) {
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

        if (state.phase === 'success') {
          log.success(
            config.watch
              ? `⚙️  watching for changes in all bundles after ${state.durSec} sec`
              : `⚙️  all bundles compiled successfully after ${state.durSec} sec`
          );
          return true;
        }

        throw new Error(`unhandled optimizer message: ${inspect(msg)}`);
      })
    );
  });
}
