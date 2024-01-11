/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebDriver, logging } from 'selenium-webdriver';
import * as Rx from 'rxjs';
import { mergeMap, delay } from 'rxjs/operators';
import { NoSuchSessionError } from 'selenium-webdriver/lib/error';

export const FINAL_LOG_ENTRY_PREFIX = 'WEBDRIVER SESSION IS STOPPED';

/**
 * Create an observable that emits log entries representing the calls to log messages
 * available for a specific logger.
 */
export function pollForLogEntry$(driver: WebDriver, type: string, ms: number) {
  const logCtrl = driver.manage().logs();
  const poll$ = new Rx.BehaviorSubject(undefined);

  const FINAL_MSG = '@@final@@';

  return new Rx.Observable<logging.Entry>((subscriber) => {
    subscriber.add(
      poll$
        .pipe(
          delay(ms),

          mergeMap(async () => {
            let entries: logging.Entry[] = [];
            try {
              entries = await logCtrl.get(type);
            } catch (error) {
              if (error instanceof NoSuchSessionError) {
                // WebDriver session is invalid, sending the last log message
                return [new logging.Entry('SEVERE', `${FINAL_LOG_ENTRY_PREFIX}: ${error.message}`)];
              }
            }
            return entries;
          }),

          // filter and flatten list of entries
          mergeMap((entries) => {
            const filtered = entries.filter((entry) => {
              if (entry.message.includes(FINAL_MSG)) {
                poll$.complete();
                return false;
              }

              // ignore react devtools
              if (entry.message.includes('Download the React DevTools')) {
                return false;
              }

              // down-level inline script errors
              if (entry.message.includes('Refused to execute inline script')) {
                entry.level = logging.getLevel('INFO');
              }

              return true;
            });

            if (!poll$.closed) {
              // schedule next poll
              poll$.next(undefined);
            }

            return filtered;
          })
        )
        .subscribe(subscriber)
    );
  });
}
