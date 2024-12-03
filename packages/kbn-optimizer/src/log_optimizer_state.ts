/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';

import { ToolingLog } from '@kbn/tooling-log';
import { hasNonDefaultThemeTags } from '@kbn/core-ui-settings-common';
import { tap } from 'rxjs';

import { OptimizerConfig } from './optimizer';
import { OptimizerUpdate$ } from './run_optimizer';
import { CompilerMsg, pipeClosure } from './common';

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

        if (event?.type === 'bundle not cached' && event.reason !== 'cache disabled') {
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
          const moduleCount = event.bundles.reduce(
            (acc, b) => acc + (b.cache.getModuleCount() ?? NaN),
            0
          );
          const workUnits = event.bundles.reduce(
            (acc, b) => acc + (b.cache.getWorkUnits() ?? NaN),
            0
          );

          log.info(
            `starting worker [${event.bundles.length} ${
              event.bundles.length === 1 ? 'bundle' : 'bundles'
            }]`
          );

          if (moduleCount || workUnits) {
            log.debug(`modules [${moduleCount || '?'}] work units [${workUnits || '?'}]`);
          }
        }

        if (state.phase === 'reallocating') {
          log.debug(`changes detected...`);
          return;
        }

        if (state.phase === 'initialized') {
          if (!loggedInit) {
            loggedInit = true;
            if (config.cache) {
              log.info(`initialized, ${state.offlineBundles.length} bundles cached`);
            } else {
              log.info('initialized');
              log.warning(
                'cache disabled, new caches will still be written but existing caches are ignored'
              );
            }

            if (hasNonDefaultThemeTags(config.themeTags)) {
              log.warning(
                `running with non-default [${config.themeTags}] set of themes, customize with the KBN_OPTIMIZER_THEMES environment variable`
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

          bundleStates.set(id, type);

          if (type === 'running') {
            bundlesThatWereBuilt.add(id);
          }
        }

        if (state.phase === 'running' || state.phase === 'initializing') {
          return;
        }

        if (state.phase === 'issue') {
          log.error(`webpack compile errors`);
          log.indent(4, () => {
            for (const b of state.compilerStates) {
              if (b.type === 'compiler issue') {
                log.error(`[${b.bundleId}] build`);
                log.indent(4, () => {
                  log.error(b.failure);
                });
              }
            }
          });
          return;
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

          return;
        }

        throw new Error(`unhandled optimizer message: ${inspect(update)}`);
      })
    );
  });
}
