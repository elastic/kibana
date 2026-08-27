/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as jsondiffpatch from 'jsondiffpatch';

import { BehaviorSubject, combineLatest, debounceTime, filter, map, pairwise, skip } from 'rxjs';

export function startTrackingHistory<T extends object = {}>({
  state$,
  mapState,
  maxSize,
  disableUndoRedo$ = new BehaviorSubject<boolean>(true),
}: {
  state$: BehaviorSubject<T | undefined>;
  mapState: (state: T) => T;
  maxSize: number;
  disableUndoRedo$?: BehaviorSubject<boolean>;
}) {
  const history: jsondiffpatch.Delta[] = [];
  const pointer$ = new BehaviorSubject<number>(-1);
  let undoOrRedoAction = false;

  const currentState$ = new BehaviorSubject<T | undefined>(state$.getValue());
  const disabledActions$ = new BehaviorSubject({
    undo: true as boolean,
    redo: true as boolean,
  });

  const stateSubscription = state$
    .pipe(
      filter((state): state is T => Boolean(state)),
      map(mapState),
      pairwise()
    )
    .subscribe(([previous, current]) => {
      if (undoOrRedoAction) {
        // do not add to history if state change is coming from undo or redo action
        undoOrRedoAction = false;
        return;
      }
      const diff = jsondiffpatch.diff(previous, current);
      if (!diff) return;

      const pointer = pointer$.getValue();
      if (pointer !== history.length - 1) {
        // if not at the top of the history stack, then drop all history that came after the current pointer
        history.length = pointer + 1;
      } else if (history.length > maxSize) {
        // drop the bottom of the history stack when max size is reached
        history.shift();
      }
      // add the new patch to the top of the history stack and increment (see note) the pointer
      history.push(diff);

      pointer$.next(history.length - 1); // note: this is safer than incrementing, just in case things get out of sync
    });

  const disabledActionsSubscription = combineLatest([pointer$, disableUndoRedo$]).subscribe(
    ([pointer, disableUndoRedo]) => {
      disabledActions$.next({
        undo: disableUndoRedo || pointer <= -1, // at the bottom of the history stack
        redo: disableUndoRedo || pointer + 1 >= history.length, // at the top of the history stack
      });
    }
  );

  const undoPatch = () => {
    if (disableUndoRedo$.getValue()) return false;
    const pointer = pointer$.getValue();
    if (pointer <= -1) return false; // cannot undo - already at the bottom of the stack

    const reversedPatch = jsondiffpatch.reverse(history[pointer]); // must undo the **current** patch
    undoOrRedoAction = true;
    currentState$.next(jsondiffpatch.patch(state$.getValue(), reversedPatch) as T);
    pointer$.next(pointer - 1);
    return true;
  };

  const redoPatch = () => {
    if (disableUndoRedo$.getValue()) return false;
    const pointer = pointer$.getValue();
    if (pointer + 1 >= history.length) return false; // cannot redo - already at the top of the stack

    const patch = history[pointer + 1]; // must apply the **next** patch
    undoOrRedoAction = true;
    currentState$.next(jsondiffpatch.patch(state$.getValue(), patch) as T);
    pointer$.next(pointer + 1);
    return true;
  };

  const keyDownHandler = (event: KeyboardEvent) => {
    const isModifier = event.ctrlKey || event.metaKey;
    if (isModifier) {
      const key = event.key.toLocaleLowerCase();
      if (key === 'z') {
        undoPatch();
      } else if (key === 'y') {
        const success = redoPatch();
        if (success) {
          // prevent default behaviour (for example, on chrome, this opens history by default)
          event.preventDefault();
        }
      }
    }
  };
  document.addEventListener('keydown', keyDownHandler);

  return {
    api: {
      currentState$: currentState$.pipe(skip(1)),
      disabledActions$,
      undo: undoPatch,
      redo: redoPatch,
    },
    cleanup: () => {
      stateSubscription.unsubscribe();
      disabledActionsSubscription.unsubscribe();
      document.removeEventListener('keydown', keyDownHandler);
    },
  };
}
