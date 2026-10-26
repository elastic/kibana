/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { startTrackingHistory } from './history';

const setupHistory = ({ initial, maxSize = 10 }: { initial?: object; maxSize?: number }) => {
  const state$ = new BehaviorSubject<object | undefined>(initial);
  const setState = jest.fn(async (state: object) => {
    state$.next(state);
  });
  const { api, cleanup } = startTrackingHistory<object>({
    onStateChange$: state$,
    setState,
    maxSize,
  });
  return { state$, setState, api, cleanup };
};

describe('startTrackingHistory', () => {
  describe('initial state', () => {
    it('disables both undo and redo on init', () => {
      const { api, cleanup } = setupHistory({});
      expect(api.canUndo$.value).toBe(false);
      expect(api.canRedo$.value).toBe(false);
      cleanup();
    });
  });

  describe('history tracking', () => {
    it('enables undo after a state change is recorded', () => {
      const { state$, api, cleanup } = setupHistory({ initial: { value: 0 } });
      state$.next({ value: 1 });
      expect(api.canUndo$.value).toBe(true);
      expect(api.canRedo$.value).toBe(false);
      cleanup();
    });
  });

  describe('undo', () => {
    it('calls setState with the previous state', async () => {
      const { state$, setState, api, cleanup } = setupHistory({ initial: { value: 0 } });
      state$.next({ value: 1 });

      await api.undo();
      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({ value: 0 });

      cleanup();
    });

    it('records multiple distinct state changes', async () => {
      const { state$, setState, api, cleanup } = setupHistory({ initial: { value: 0 } });
      state$.next({ value: 1 });
      state$.next({ value: 2 });
      state$.next({ value: 3 });

      await api.undo();
      await api.undo();
      await api.undo();
      expect(setState).toHaveBeenCalledTimes(3);

      cleanup();
    });

    it('enables redo after an undo', async () => {
      const { state$, api, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      await api.undo();
      expect(api.canRedo$.value).toBe(true);

      cleanup();
    });

    it('disables undo once the bottom of the stack is reached', async () => {
      const { state$, api, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      await api.undo();
      expect(api.canUndo$.value).toBe(false);

      cleanup();
    });

    it('does not add the undone state change back into history', async () => {
      const { state$, setState, api, cleanup } = setupHistory({ initial: { value: 0 } });
      state$.next({ value: 1 });
      await api.undo(); // setState echoes { value: 0 } back via state$, which is ignored by undoOrRedoAction

      await api.redo();
      expect(setState).toHaveBeenLastCalledWith({ value: 1 });

      cleanup();
    });
  });

  describe('redo', () => {
    it('re-applies the next change after an undo', async () => {
      const { state$, setState, api, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      await api.undo();
      await api.redo();
      expect(setState).toHaveBeenLastCalledWith({ value: 1 });

      cleanup();
    });

    it('disables redo once the top of the stack is reached', async () => {
      const { state$, api, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      await api.undo();
      await api.redo();
      expect(api.canRedo$.value).toBe(false);

      cleanup();
    });
  });

  describe('history branch pruning', () => {
    it('drops future history when a new change is made while not at the top of the stack', async () => {
      const { state$, api, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      state$.next({ value: 2 });
      await api.undo();
      // setState echoes { value: 1 } back into state$ via our mock, which is ignored
      state$.next({ value: 99 }); // new branch — prunes the future history

      expect(api.canRedo$.value).toBe(false);

      cleanup();
    });

    it('drops the oldest entry when the history stack exceeds maxSize', async () => {
      const { state$, api, cleanup } = setupHistory({ initial: { value: 0 }, maxSize: 1 });

      state$.next({ value: 1 }); // diff 0→1 recorded
      state$.next({ value: 2 }); // diff 1→2 recorded
      state$.next({ value: 3 }); // diff 0→1 evicted; diff 2→3 added
      await api.undo(); // 3→2
      await api.undo(); // 2→1  — now at bottom; 0→1 no longer exists

      expect(api.canUndo$.value).toBe(false);

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
      const { state$, setState, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      fireKey('z', 'ctrlKey');
      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({ value: 0 });

      cleanup();
    });

    it('triggers undo on Meta+Z', () => {
      const { state$, setState, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      fireKey('z', 'metaKey');
      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({ value: 0 });

      cleanup();
    });

    it('triggers redo on Ctrl+Y', async () => {
      const {
        state$,
        setState,
        api: { undo },
        cleanup,
      } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      await undo();
      fireKey('y', 'ctrlKey');
      expect(setState).toHaveBeenCalledTimes(2);
      expect(setState).toHaveBeenLastCalledWith({ value: 1 });

      cleanup();
    });

    it('does not trigger undo without a modifier key', () => {
      const { state$, setState, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      expect(setState).not.toHaveBeenCalled();

      cleanup();
    });

    it('does not trigger redo without a modifier key', async () => {
      const {
        state$,
        setState,
        api: { undo: undoFn },
        cleanup,
      } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      await undoFn();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
      expect(setState).toHaveBeenCalledTimes(1); // only the undo, not the redo

      cleanup();
    });
  });

  describe('cleanup', () => {
    it('stops tracking new state changes after cleanup', () => {
      const { state$, api, cleanup } = setupHistory({ initial: { value: 0 } });
      cleanup();
      state$.next({ value: 1 });
      expect(api.canUndo$.value).toBe(false);
    });

    it('removes the keyboard event listener after cleanup', () => {
      const { state$, setState, cleanup } = setupHistory({ initial: { value: 0 } });

      state$.next({ value: 1 });
      cleanup();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true })
      );
      expect(setState).not.toHaveBeenCalled();
    });
  });
});
