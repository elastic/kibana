/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import * as jsondiffpatch from 'jsondiffpatch';
import { BehaviorSubject, pairwise, distinctUntilChanged } from 'rxjs';

export function startTrackingHistory<T extends object = {}>({
  state$,
  maxSize,
}: {
  state$: BehaviorSubject<T>;
  maxSize: number;
}) {
  let pointer = 0;
  let history: jsondiffpatch.Delta[] = [];
  const currentState$: BehaviorSubject<T> = new BehaviorSubject<T>(state$.getValue());
  const availableActions$: BehaviorSubject<{ undo: boolean; redo: boolean }> = new BehaviorSubject({
    undo: false as boolean,
    redo: false as boolean,
  });

  const stateSubscription = state$
    .pipe(distinctUntilChanged(deepEqual), pairwise())
    .subscribe(([previous, current]) => {
      console.log('STATE CHANGED', { pointer, history });
      if (pointer !== history.length) {
        history = history.slice(0, pointer);
        return;
      }

      const diff = jsondiffpatch.diff(previous, current);
      history.push(diff);
      if (history.length > maxSize) {
        history.shift(); // drop the bottom of the patch queue
      } else {
        pointer += 1;
      }
    });

  return {
    api: {
      currentState$,
      availableActions$,
      undo: () => {
        console.log('UNDO', { pointer, history });
        if (pointer > 0) {
          pointer -= 1;
          const reversedPatch = jsondiffpatch.reverse(history[pointer]);
          console.log({ currentState: state$.getValue(), reversedPatch });
          currentState$.next(jsondiffpatch.patch(state$.getValue(), reversedPatch) as T);
        }
        console.log('AFTER UNDO', { pointer, history });
      },
      redo: () => {
        if (pointer < history.length) {
          pointer += 1;
          const patch = history[pointer];
          currentState$.next(jsondiffpatch.patch(state$.getValue(), patch) as T);
        }
        console.log({ pointer, history });
      },
      isAtEnd: () => pointer === history.length,
    },
    cleanup: () => {
      stateSubscription.unsubscribe();
    },
  };
}
