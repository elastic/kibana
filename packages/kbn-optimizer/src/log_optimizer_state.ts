/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import { ToolingLog } from '@kbn/tooling-log';
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
          let workUnits = 0;
          for (const bundle of event.bundles) {
            moduleCount += bundle.cache.getModuleCount() ?? NaN;
            workUnits += bundle.cache.getWorkUnits() ?? NaN;
          }

          log.info(
            `starting worker [${event.bundles.length} ${
              event.bundles.length === 1 ? 'bundle' : 'bundles'
            }]`
          );
          log.debug(`modules [${moduleCount}] work units [${workUnits}]`);
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
