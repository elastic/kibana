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
  let history: jsondiffpatch.Delta[] = [];
  const pointer$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  const currentState$: BehaviorSubject<T> = new BehaviorSubject<T>(state$.getValue());
  const disabledActions$: BehaviorSubject<{ undo: boolean; redo: boolean }> = new BehaviorSubject({
    undo: true as boolean,
    redo: true as boolean,
  });

  const stateSubscription = state$
    .pipe(distinctUntilChanged(deepEqual), pairwise())
    .subscribe(([previous, current]) => {
      const pointer = pointer$.getValue();
      console.log({ pointerBefore: pointer });
      if (pointer > 0 && pointer < history.length) {
        console.log('do not update state');
        // history = history.slice(0, pointer);
        return;
      }

      const diff = jsondiffpatch.diff(previous, current);
      history.push(diff);
      if (history.length > maxSize) {
        history.shift(); // drop the bottom of the patch queue
      } else if (history.length > 1) {
        pointer$.next(Math.max(pointer + 1, history.length));
      }
      // if (history.length > maxSize) {
      //   history.shift(); // drop the bottom of the patch queue
      // } else if (history.length > 1) {
      //   pointer$.next(Math.max(pointer + 1, history.length));
      // }
      pointer$.next(history.length);

      console.log('STATE CHANGED', { pointerAfter: pointer$.getValue(), history });
    });

  const disabledActionsSubscription = pointer$.subscribe((pointer) => {
    console.log('disabled actions subscription', pointer, history);
    disabledActions$.next({
      undo: pointer === 1,
      redo: pointer === history.length,
    });
  });

  return {
    api: {
      currentState$,
      disabledActions$,
      undo: () => {
        const pointer = pointer$.getValue();
        if (pointer > 1) {
          const newPointer = pointer - 1;
          const reversedPatch = jsondiffpatch.reverse(history[newPointer]);
          currentState$.next(jsondiffpatch.patch(state$.getValue(), reversedPatch) as T);
          pointer$.next(newPointer);
          console.log('UNDO - after', { pointer: pointer$.getValue() });
        }
      },
      redo: () => {
        const pointer = pointer$.getValue();
        console.log('REDO', { pointer, history });
        if (pointer < history.length) {
          const newPointer = pointer;
          const patch = history[newPointer];
          currentState$.next(jsondiffpatch.patch(state$.getValue(), patch) as T);
          pointer$.next(newPointer + 1);
          console.log('REDO - after', { pointer: pointer$.getValue() });
        }
      },
    },
    cleanup: () => {
      stateSubscription.unsubscribe();
      disabledActionsSubscription.unsubscribe();
    },
  };
}
