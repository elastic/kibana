/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as jsondiffpatch from 'jsondiffpatch';

import { BehaviorSubject, map, pairwise, skip } from 'rxjs';

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
  let undoOrRedoAction = false;

  const currentState$: BehaviorSubject<T> = new BehaviorSubject<T>(state$.getValue());
  const disabledActions$: BehaviorSubject<{ undo: boolean; redo: boolean }> = new BehaviorSubject({
    undo: true as boolean,
    redo: true as boolean,
  });

  const stateSubscription = state$
    .pipe(map(mapState), pairwise())
    .subscribe(([previous, current]) => {
      if (undoOrRedoAction) {
        // do not add to history if state change is coming from undo or redo action
        undoOrRedoAction = false;
        return;
      }

      const diff = jsondiffpatch.diff(previous, current);

      const pointer = pointer$.getValue();
      if (pointer !== history.length - 1) {
        // if not at the top of the history stack, then drop all history that came after the current pointer
        history.length = pointer + 1;
      } else if (history.length > maxSize) {
        // drop the bottom of the history stack when max size is reached
        history.shift();
      }
      history.push(diff);
      pointer$.next(history.length - 1);
    });

  const disabledActionsSubscription = pointer$.subscribe((pointer) => {
    disabledActions$.next({
      undo: pointer <= -1, // at the start of history
      redo: pointer + 1 >= history.length, // at the end of history
    });
  });

  return {
    api: {
      currentState$: currentState$.pipe(skip(1)),
      disabledActions$,
      undo: () => {
        const pointer = pointer$.getValue();

        const reversedPatch = jsondiffpatch.reverse(history[pointer]); // must undo the **current** patch
        undoOrRedoAction = true;
        currentState$.next(jsondiffpatch.patch(state$.getValue(), reversedPatch) as T);
        pointer$.next(pointer - 1);
      },
      redo: () => {
        const pointer = pointer$.getValue();
        const patch = history[pointer + 1]; // must apply the **next** patch
        undoOrRedoAction = true;
        currentState$.next(jsondiffpatch.patch(state$.getValue(), patch) as T);
        pointer$.next(pointer + 1);
      },
    },
    cleanup: () => {
      stateSubscription.unsubscribe();
      disabledActionsSubscription.unsubscribe();
    },
  };
}
