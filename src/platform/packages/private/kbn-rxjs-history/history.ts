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
import { BehaviorSubject, pairwise, distinctUntilChanged, skip, map } from 'rxjs';

export function startTrackingHistory<T extends object = {}>({
  state$,
  mapState,
  maxSize,
}: {
  state$: BehaviorSubject<T>;
  mapState: (state: T) => T;
  maxSize: number;
}) {
  const history: jsondiffpatch.Delta[] = [];
  const pointer$: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  const currentState$: BehaviorSubject<T> = new BehaviorSubject<T>(state$.getValue());
  const disabledActions$: BehaviorSubject<{ undo: boolean; redo: boolean }> = new BehaviorSubject({
    undo: true as boolean,
    redo: true as boolean,
  });

  const stateSubscription = state$
    .pipe(skip(1), map(mapState), distinctUntilChanged(deepEqual), pairwise())
    .subscribe(([previous, current]) => {
      const pointer = pointer$.getValue();
      // console.log('before early return', { pointerBefore: pointer, history: [...history] });
      if (history.length && pointer < history.length - 1) {
        // do not update state when pointer is not at the end of the history queue
        return;
      }

      const diff = jsondiffpatch.diff(previous, current);
      // console.log({ previous, current, diff });
      history.push(diff);
      // console.log({ history: history.length, maxSize, pointer: pointer$.getValue() });
      // if (history.length > maxSize) {
      //   console.log('SHIFT');
      //   history.shift(); // drop the bottom of the patch queue
      // }
      // if (history.length > maxSize) {
      //   history.shift(); // drop the bottom of the patch queue
      // } else if (history.length > 1) {
      //   pointer$.next(Math.max(pointer + 1, history.length));
      // }
      pointer$.next(history.length - 1);

      console.log('STATE CHANGED', { pointerAfter: pointer$.getValue(), history: [...history] });
    });

  const disabledActionsSubscription = pointer$.subscribe((pointer) => {
    // console.log('disabled actions subscription', {
    //   pointer,
    //   history: [...history],
    //   undo: pointer - 1 < 0,
    //   redo: pointer + 1 >= history.length,
    // });
    disabledActions$.next({
      undo: pointer <= -1, // at the start of history
      redo: pointer + 1 >= history.length, // at the end of history
    });
  });

  return {
    api: {
      currentState$,
      disabledActions$,
      undo: () => {
        const pointer = pointer$.getValue();

        const reversedPatch = jsondiffpatch.reverse(history[pointer]); // must undo the **current** patch
        currentState$.next(jsondiffpatch.patch(state$.getValue(), reversedPatch) as T);
        pointer$.next(pointer - 1);
        console.log('UNDO - after', { pointer: pointer$.getValue(), history: [...history] });
      },
      redo: () => {
        const pointer = pointer$.getValue();
        const patch = history[pointer + 1]; // must apply the **next** patch
        currentState$.next(jsondiffpatch.patch(state$.getValue(), patch) as T);
        pointer$.next(pointer + 1);
        console.log('REDO - after', { pointer: pointer$.getValue(), history: [...history] });
      },
    },
    cleanup: () => {
      stateSubscription.unsubscribe();
      disabledActionsSubscription.unsubscribe();
    },
  };
}
