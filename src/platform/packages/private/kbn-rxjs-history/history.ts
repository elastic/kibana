/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as jsondiffpatch from 'jsondiffpatch';
import { cloneDeep } from 'lodash';

import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, filter, pairwise } from 'rxjs';

export function startTrackingHistory<T extends object = {}>({
  onStateChange$,
  setState,
  maxSize,
  pause$,
}: {
  onStateChange$: Observable<T | undefined>;
  setState: (state: T) => Promise<void>;
  maxSize: number;
  pause$?: BehaviorSubject<boolean>;
}) {
  pause$ = pause$ ?? new BehaviorSubject(false);
  const history: jsondiffpatch.Delta[] = [];
  const pointer$ = new BehaviorSubject<number>(-1);
  let undoOrRedoAction = false;

  let latestState: T | undefined;
  const stateSubscription = onStateChange$
    .pipe(
      filter((state): state is T => Boolean(state)),
      pairwise()
    )
    .subscribe(([previous, current]) => {
      latestState = current;
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

  const canUndo$ = new BehaviorSubject(false);
  const canRedo$ = new BehaviorSubject(false);
  const pauseHistorySubscription = combineLatest([pointer$, pause$]).subscribe(
    ([pointer, paused]) => {
      canRedo$.next(!paused && pointer + 1 < history.length);
      canUndo$.next(!paused && pointer > -1);
    }
  );

  const undoPatch = async () => {
    canRedo$.next(false);
    canUndo$.next(false);
    const pointer = pointer$.getValue();
    const reversedPatch = jsondiffpatch.reverse(history[pointer]); // must undo the **current** patch
    undoOrRedoAction = true;
    await setState(jsondiffpatch.patch(cloneDeep(latestState), reversedPatch) as T);
    pointer$.next(pointer - 1);
  };

  const redoPatch = async () => {
    canRedo$.next(false);
    canUndo$.next(false);
    const pointer = pointer$.getValue();
    const patch = history[pointer + 1]; // must apply the **next** patch
    undoOrRedoAction = true;
    await setState(jsondiffpatch.patch(cloneDeep(latestState), patch) as T);
    pointer$.next(pointer + 1);
  };

  const keyDownHandler = (event: KeyboardEvent) => {
    if (
      pause$.getValue() || // if history is paused, ignore keyboard events, or...
      // if in an input field, do not allow undo/redo to be triggered by keyboard shortcuts
      (event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
    ) {
      return;
    }

    const isModifier = event.ctrlKey || event.metaKey;
    if (isModifier) {
      const key = event.key.toLocaleLowerCase();
      if (key === 'z' && canUndo$.getValue()) {
        // no need to await since undoPatch synchronously sets canUndo$ to false
        undoPatch();
        event.preventDefault();
      } else if (key === 'y' && canRedo$.getValue()) {
        // no need to await since redoPatch synchronously sets canRedo$ to false
        redoPatch();
        event.preventDefault();
      }
    }
  };
  document.addEventListener('keydown', keyDownHandler);

  return {
    api: {
      canUndo$,
      canRedo$,
      undo: undoPatch,
      redo: redoPatch,
    },
    cleanup: () => {
      stateSubscription.unsubscribe();
      pauseHistorySubscription.unsubscribe();
      document.removeEventListener('keydown', keyDownHandler);
    },
  };
}
