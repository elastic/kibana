/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebDriver, logging } from 'selenium-webdriver';
import * as Rx from 'rxjs';
import { mergeMap, catchError, delay, repeat } from 'rxjs';
import { NoSuchSessionError, NoSuchWindowError } from 'selenium-webdriver/lib/error';

export const FINAL_LOG_ENTRY_PREFIX = 'WEBDRIVER SESSION IS STOPPED';

/**
 * Create an observable that emits log entries representing the calls to log messages
 * available for a specific logger.
 */
export function pollForLogEntry$(driver: WebDriver, type: string, ms: number) {
  const logCtrl = driver.manage().logs();

  // setup log polling
  return Rx.defer(async () => await logCtrl.get(type)).pipe(
    // filter and flatten list of entries
    mergeMap((entries) =>
      entries.filter((entry) => {
        // ignore react devtools
        if (entry.message.includes('Download the React DevTools')) {
          return false;
        }

        // down-level inline script errors
        if (entry.message.includes('Refused to execute inline script')) {
          entry.level = logging.getLevel('INFO');
        }

        return true;
      })
    ),

    // resubscribe when parent completes with delay by `ms` milliseconds
    repeat(),
    delay(ms),

    catchError((error, resubscribe) => {
      if (
        error instanceof NoSuchSessionError || // session is invalid
        error instanceof NoSuchWindowError || // browser window crashed
        error?.message.startsWith('ECONNREFUSED') // webdriver server is not responding, often after one of previous errors
      ) {
        // WebDriver session is invalid, sending the last log message
        return Rx.concat([
          new logging.Entry('SEVERE', `${FINAL_LOG_ENTRY_PREFIX}: ${error.message}`),
        ]);
      } else {
        return Rx.concat(
          // log error as a log entry
          [new logging.Entry('SEVERE', `ERROR FETCHING BROWSR LOGS: ${error.message}`)],

          // pause 10 seconds then resubscribe
          Rx.of(1).pipe(
            delay(10 * 1000),
            mergeMap(() => resubscribe)
          )
        );
      }
    })
  );
}
