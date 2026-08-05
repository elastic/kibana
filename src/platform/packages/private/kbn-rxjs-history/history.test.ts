/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom, skip } from 'rxjs';
import { startTrackingHistory } from './history';

interface TestState {
  value: number;
}

const makeSetup = (
  initial: TestState = { value: 0 },
  maxSize = 10,
  disableUndoRedoInitial = false
) => {
  const state$ = new BehaviorSubject<TestState>(initial);
  const disableUndoRedo$ = new BehaviorSubject<boolean>(disableUndoRedoInitial);
  const { api, cleanup } = startTrackingHistory<TestState>({
    state$,
    mapState: (s) => s,
    maxSize,
    disableUndoRedo$,
  });
  return { state$, disableUndoRedo$, api, cleanup };
};

describe('startTrackingHistory', () => {
  describe('initial state', () => {
    it('disables both undo and redo', () => {
      const state$ = new BehaviorSubject<TestState>({ value: 0 });
      const { api, cleanup } = startTrackingHistory({
        state$,
        mapState: (s) => s,
        maxSize: 10,
      });
      expect(api.disabledActions$.value).toEqual({ undo: true, redo: true });
      cleanup();
    });
  });

  describe('history tracking', () => {
    it('enables undo after a state change is recorded', async () => {
      const { state$, api, cleanup } = makeSetup();
      state$.next({ value: 1 });

      const isDisabled = await firstValueFrom(api.disabledActions$.pipe(skip(1)));
      expect(isDisabled).toMatchObject({ undo: false, redo: true });
      cleanup();
    });

    it('does not record a history entry when the mapped state is unchanged', async () => {
      const state$ = new BehaviorSubject<{ value: number; ignored: string }>({
        value: 0,
        ignored: 'a',
      });
      const disableUndoRedo$ = new BehaviorSubject<boolean>(false);
      const { api, cleanup } = startTrackingHistory({
        state$,
        mapState: ({ value }) => ({ value, ignored: 'normalized' }),
        maxSize: 10,
        disableUndoRedo$,
      });
      state$.next({ value: 0, ignored: 'b' }); // only the mapped-away field changed

      const isDisabled = await firstValueFrom(api.disabledActions$.pipe(skip(1)));
      expect(isDisabled.undo).toBe(true);
      cleanup();
    });
  });

  describe('undo', () => {
    it('emits the previous state on currentState$', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      state$.next({ value: 1 });

      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      api.undo();

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual({ value: 0 });
      cleanup();
    });

    it('records multiple distinct state changes', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      state$.next({ value: 1 });
      state$.next({ value: 2 });
      state$.next({ value: 3 });

      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      api.undo();
      api.undo();
      api.undo();

      expect(emitted).toHaveLength(3);
      cleanup();
    });

    it('is a no-op when at the bottom of the history stack', () => {
      const { api, cleanup } = makeSetup();
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      api.undo();
      expect(emitted).toHaveLength(0);
      cleanup();
    });

    it('is a no-op when disableUndoRedo$ is true', () => {
      const { state$, disableUndoRedo$, api, cleanup } = makeSetup();
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      disableUndoRedo$.next(true);
      api.undo();
      expect(emitted).toHaveLength(0);
      cleanup();
    });

    it('enables redo after an undo', async () => {
      const { state$, api, cleanup } = makeSetup();
      state$.next({ value: 1 });
      api.undo();
      const isDisabled = await firstValueFrom(api.disabledActions$.pipe(skip(1)));
      expect(isDisabled.redo).toBe(false);
      cleanup();
    });

    it('disables undo once the bottom of the stack is reached', async () => {
      const { state$, api, cleanup } = makeSetup();
      state$.next({ value: 1 });
      api.undo();
      const isDisabled = await firstValueFrom(api.disabledActions$.pipe(skip(1)));
      expect(isDisabled.undo).toBe(true);
      cleanup();
    });

    it('does not add the undone state change back into history', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      state$.next({ value: 1 });
      api.undo();
      // Simulate the consumer echoing the undone state back into state$;
      // the undoOrRedoAction flag must prevent this from creating a history entry.
      state$.next({ value: 0 });
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      api.redo();
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual({ value: 1 });
      cleanup();
    });
  });

  describe('redo', () => {
    it('re-applies the next change after an undo', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      api.undo(); // emitted[0] = { value: 0 }
      api.redo(); // emitted[1] = { value: 1 }
      expect(emitted).toHaveLength(2);
      expect(emitted[1]).toEqual({ value: 1 });
      cleanup();
    });

    it('is a no-op when already at the top of the history stack', () => {
      const { state$, api, cleanup } = makeSetup();
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      api.redo();
      expect(emitted).toHaveLength(0);
      cleanup();
    });

    it('is a no-op when disableUndoRedo$ is true', () => {
      const { state$, disableUndoRedo$, api, cleanup } = makeSetup();
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      api.undo(); // emitted[0]
      disableUndoRedo$.next(true);
      api.redo(); // blocked
      expect(emitted).toHaveLength(1);
      cleanup();
    });

    it('disables redo once the top of the stack is reached', async () => {
      const { state$, api, cleanup } = makeSetup();
      state$.next({ value: 1 });
      api.undo();
      api.redo();
      const isDisabled = await firstValueFrom(api.disabledActions$.pipe(skip(1)));
      expect(isDisabled.redo).toBe(true);
      cleanup();
    });
  });

  describe('history branch pruning', () => {
    it('drops future history when a new change is made while not at the top of the stack', async () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      state$.next({ value: 1 });
      state$.next({ value: 2 });
      api.undo();
      // Simulate the consumer echoing the undone state back into state$;
      // this clears the undoOrRedoAction flag without recording a history entry.
      state$.next({ value: 1 });
      state$.next({ value: 99 }); // new branch — prunes the future history

      const isDisabled = await firstValueFrom(api.disabledActions$.pipe(skip(1)));
      expect(isDisabled.redo).toBe(true);
      cleanup();
    });
  });

  describe('maxSize', () => {
    it('drops the oldest entry when the history stack exceeds maxSize', async () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 }, 1);
      state$.next({ value: 1 }); // diff 0→1 recorded
      state$.next({ value: 2 }); // diff 1→2 recorded (at capacity)
      state$.next({ value: 3 }); // diff 0→1 evicted; diff 2→3 added
      api.undo(); // 3→2
      api.undo(); // 2→1  — now at bottom; 0→1 no longer exists

      const isDisabled = await firstValueFrom(api.disabledActions$.pipe(skip(1)));
      expect(isDisabled.undo).toBe(true);
      cleanup();
    });
  });

  describe('disableUndoRedo$', () => {
    it('disables both actions when disableUndoRedo$ becomes true', async () => {
      const { state$, disableUndoRedo$, api, cleanup } = makeSetup();
      // First, wait for undo to be enabled so we can verify the override.
      state$.next({ value: 1 });
      expect(await firstValueFrom(api.disabledActions$.pipe(skip(1)))).toEqual({
        undo: false,
        redo: true,
      });
      disableUndoRedo$.next(true);
      expect(await firstValueFrom(api.disabledActions$.pipe(skip(1)))).toEqual({
        undo: true,
        redo: true,
      });
      cleanup();
    });

    it('re-enables actions when disableUndoRedo$ returns to false', async () => {
      const { state$, disableUndoRedo$, api, cleanup } = makeSetup();
      state$.next({ value: 1 });
      disableUndoRedo$.next(true);
      expect(await firstValueFrom(api.disabledActions$.pipe(skip(1)))).toEqual({
        undo: true,
        redo: true,
      });
      disableUndoRedo$.next(false);
      expect(await firstValueFrom(api.disabledActions$.pipe(skip(1)))).toEqual({
        undo: false,
        redo: true,
      });
      cleanup();
    });
  });

  describe('keyboard shortcuts', () => {
    const fireKey = (key: string, modifier: 'ctrlKey' | 'metaKey') => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key, [modifier]: true, cancelable: true, bubbles: true })
      );
    };

    it('triggers undo on Ctrl+Z', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      fireKey('z', 'ctrlKey');
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual({ value: 0 });
      cleanup();
    });

    it('triggers undo on Meta+Z', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      fireKey('z', 'metaKey');
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual({ value: 0 });
      cleanup();
    });

    it('triggers redo on Ctrl+Y', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      api.undo(); // emitted[0]
      fireKey('y', 'ctrlKey');
      expect(emitted).toHaveLength(2);
      expect(emitted[1]).toEqual({ value: 1 });
      cleanup();
    });

    it('does not trigger undo without a modifier key', () => {
      const { state$, api, cleanup } = makeSetup();
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      expect(emitted).toHaveLength(0);
      cleanup();
    });

    it('does not trigger redo without a modifier key', () => {
      const { state$, api, cleanup } = makeSetup();
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      api.undo();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
      expect(emitted).toHaveLength(1); // only the undo, not the redo
      cleanup();
    });
  });

  describe('cleanup', () => {
    it('stops tracking new state changes after cleanup', () => {
      const { state$, api, cleanup } = makeSetup();
      cleanup();
      state$.next({ value: 1 });
      expect(api.disabledActions$.value.undo).toBe(true);
    });

    it('removes the keyboard event listener after cleanup', () => {
      const { state$, api, cleanup } = makeSetup({ value: 0 });
      const emitted: TestState[] = [];
      api.currentState$.subscribe((s) => emitted.push(s));
      state$.next({ value: 1 });
      cleanup();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true })
      );
      expect(emitted).toHaveLength(0);
    });
  });
});
