/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defer, Subject } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { once } from 'lodash';

export type AutoRefreshDoneFn = () => void;

/**
 * Creates a loop for timepicker's auto refresh
 * It has a "confirmation" mechanism:
 * When auto refresh loop emits, it won't continue automatically,
 * until each subscriber calls received `done` function.
 *
 * @internal
 */
export const createAutoRefreshLoop = () => {
  let subscribersCount = 0;
  const tick = new Subject<AutoRefreshDoneFn>();

  let _timeoutHandle: number;
  let _timeout: number = 0;

  function start() {
    stop();
    if (_timeout === 0) return;
    const timeoutHandle = window.setTimeout(() => {
      let pendingDoneCount = subscribersCount;
      const done = () => {
        if (timeoutHandle !== _timeoutHandle) return;

        pendingDoneCount--;
        if (pendingDoneCount === 0) {
          start();
        }
      };
      tick.next(done);
    }, _timeout);

    _timeoutHandle = timeoutHandle;
  }

  function stop() {
    window.clearTimeout(_timeoutHandle);
    _timeoutHandle = -1;
  }

  return {
    stop: () => {
      _timeout = 0;
      stop();
    },
    start: (timeout: number) => {
      _timeout = timeout;
      if (subscribersCount > 0) {
        start();
      }
    },
    loop$: defer(() => {
      subscribersCount++;
      start(); // restart the loop on a new subscriber
      return tick.pipe(map((doneCb) => once(doneCb))); // each subscriber allowed to call done only once
    }).pipe(
      finalize(() => {
        subscribersCount--;
        if (subscribersCount === 0) {
          stop();
        } else {
          start(); // restart the loop to potentially unblock the interval
        }
      })
    ),
  };
};
