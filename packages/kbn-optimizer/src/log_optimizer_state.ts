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
import { tap } from 'rxjs/operators';

import { OptimizerConfig } from './optimizer';
import { OptimizerUpdate$ } from './run_optimizer';
import { CompilerMsg, pipeClosure, ALL_THEMES } from './common';

export function logOptimizerState(log: ToolingLog, config: OptimizerConfig) {
  return pipeClosure((update$: OptimizerUpdate$) => {
    const bundleStates = new Map<string, CompilerMsg['type']>();
    const bundlesThatWereBuilt = new Set<string>();
    let loggedInit = false;

    return update$.pipe(
      tap((update) => {
        const { event, state } = update;

        if (event?.type === 'worker stdio') {
          log.warning(`worker`, event.stream, event.line);
        }

        if (event?.type === 'bundle not cached') {
          log.debug(
            `[${event.bundle.id}] bundle not cached because [${event.reason}]${
              event.diff ? `, diff:\n${event.diff}` : ''
            }`
          );
        }

        if (event?.type === 'bundle cached') {
          log.debug(`[${event.bundle.id}] bundle cached`);
        }

        if (event?.type === 'worker started') {
          let moduleCount = 0;
          for (const bundle of event.bundles) {
            moduleCount += bundle.cache.getModuleCount() ?? NaN;
          }
          const mcString = isFinite(moduleCount) ? String(moduleCount) : '?';
          const bcString = String(event.bundles.length);
          log.info(`starting worker [${bcString} bundles, ${mcString} modules]`);
        }

        if (state.phase === 'reallocating') {
          log.debug(`changes detected...`);
          return;
        }

        if (state.phase === 'initialized') {
          if (!loggedInit) {
            loggedInit = true;
            log.info(`initialized, ${state.offlineBundles.length} bundles cached`);
            if (config.themeTags.length !== ALL_THEMES.length) {
              log.warning(
                `only building [${config.themeTags}] themes, customize with the KBN_OPTIMIZER_THEMES environment variable`
              );
            }
          }
          return;
        }

        for (const { bundleId: id, type } of state.compilerStates) {
          const prevBundleState = bundleStates.get(id);

          if (type === prevBundleState) {
            continue;
          }

          if (type === 'running') {
            bundlesThatWereBuilt.add(id);
          }

          bundleStates.set(id, type);
          log.debug(
            `[${id}] state = "${type}"${type !== 'running' ? ` after ${state.durSec} sec` : ''}`
          );
        }

        if (state.phase === 'running' || state.phase === 'initializing') {
          return true;
        }

        if (state.phase === 'issue') {
          log.error(`webpack compile errors`);
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
          const buildCount = bundlesThatWereBuilt.size;
          bundlesThatWereBuilt.clear();

          if (state.offlineBundles.length && buildCount === 0) {
            log.success(`all bundles cached, success after ${state.durSec} sec`);
          } else {
            log.success(
              `${buildCount} bundles compiled successfully after ${state.durSec} sec` +
                (config.watch ? ', watching for changes' : '')
            );
          }

          return true;
        }

        throw new Error(`unhandled optimizer message: ${inspect(update)}`);
      })
    );
  });
}
