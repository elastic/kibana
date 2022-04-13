/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';

import { OptimizerUpdate } from './run_optimizer';

const PROGRESS_REPORT_INTERVAL = 10_000;

export function logOptimizerProgress(
  log: ToolingLog
): Rx.MonoTypeOperatorFunction<OptimizerUpdate> {
  return (update$) =>
    new Rx.Observable((subscriber) => {
      const allBundleIds = new Set();
      const completeBundles = new Set();
      let loggedCompletion = new Set();

      // catalog bundle ids and which have completed at least once, forward
      // updates to next subscriber
      subscriber.add(
        update$
          .pipe(
            tap(({ state }) => {
              for (const { bundleId, type } of state.compilerStates) {
                allBundleIds.add(bundleId);
                if (type !== 'running') {
                  completeBundles.add(bundleId);
                }
              }
            }),
            tap(subscriber)
          )
          .subscribe()
      );

      // on interval check to see if at least 3 new bundles have completed at
      // least one build and log about our progress if so
      subscriber.add(
        Rx.interval(PROGRESS_REPORT_INTERVAL).subscribe(
          () => {
            if (completeBundles.size - loggedCompletion.size < 3) {
              return;
            }

            log.info(
              `[${completeBundles.size}/${allBundleIds.size}] initial bundle builds complete`
            );
            loggedCompletion = new Set(completeBundles);
          },
          (error) => subscriber.error(error)
        )
      );
    });
}
