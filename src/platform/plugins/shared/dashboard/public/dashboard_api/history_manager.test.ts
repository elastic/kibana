/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom, skip, Subject } from 'rxjs';
import { initializeHistoryManager } from './history_manager';
import { getSampleDashboardState } from '../mocks';
import type { DashboardState } from '../../common';
import { waitFor } from '@testing-library/react';

const makeSetup = async () => {
  const initialState = getSampleDashboardState();
  // Mutable ref so getState's implementation is never replaced (mockReturnValue would drop the
  // getStateCalled$.next() side-effect; updating stateRef keeps the implementation intact).
  const stateRef = { current: { ...initialState } as DashboardState };

  const getState = jest.fn((): DashboardState => {
    return { ...stateRef.current };
  });

  const setState = jest.fn(async (state: DashboardState) => {
    stateRef.current = state;
  });

  const anyStateChange$ = new BehaviorSubject<undefined>(undefined);
  const hasOverlays$ = new BehaviorSubject<boolean>(false);
  const dataLoading$ = new BehaviorSubject<boolean>(false);

  const { api, cleanup } = initializeHistoryManager({
    anyStateChange$,
    hasOverlays$,
    setState,
    getState,
    dataLoading$,
    historyUpdated$: new Subject<void>(),
  });

  anyStateChange$.next(undefined); // initial state update
  await waitFor(() => expect(getState).toBeCalled());
  getState.mockClear();

  return {
    api,
    cleanup: () => {
      cleanup();
      getState.mockClear();
      setState.mockClear();
    },
    anyStateChange$,
    hasOverlays$,
    dataLoading$,
    getState,
    setState,
    initialState,
    stateRef,
  };
};

// trigger a state change and resolve once getState has been called (after the 60 ms debounce).
const pushStateChange = async (
  setup: Awaited<ReturnType<typeof makeSetup>>,
  title = 'Updated Title'
) => {
  setup.stateRef.current = { ...setup.initialState, title };
  setup.anyStateChange$.next(undefined);
  await waitFor(() => expect(setup.getState).toBeCalled());
};

describe('initializeHistoryManager', () => {
  describe('state management', () => {
    it('calls getState when unsavedChanges$ emits with no overlays or loading', async () => {
      const setup = await makeSetup();
      await pushStateChange(setup);
      expect(setup.getState).toHaveBeenCalled();
      setup.cleanup();
    });

    it('skips getState when hasOverlays$ is true', async () => {
      const setup = await makeSetup();
      setup.hasOverlays$.next(true);
      setup.anyStateChange$.next(undefined);
      // once disabledActions$ fires, we know that stateSubscription has run
      await firstValueFrom(setup.api.disabledActions$);
      expect(setup.getState).not.toHaveBeenCalled();
      setup.cleanup();
    });

    it('skips getState when dataLoading$ is true', async () => {
      const setup = await makeSetup();
      setup.dataLoading$.next(true);
      setup.anyStateChange$.next(undefined);
      await firstValueFrom(setup.api.disabledActions$);
      expect(setup.getState).not.toHaveBeenCalled();
      setup.cleanup();
    });

    it('resumes after overlays are dismissed', async () => {
      const setup = await makeSetup();
      setup.hasOverlays$.next(true);
      setup.anyStateChange$.next(undefined);
      await firstValueFrom(setup.api.disabledActions$);
      expect(setup.getState).not.toHaveBeenCalled();

      setup.hasOverlays$.next(false);
      await pushStateChange(setup, 'After Overlay');
      expect(setup.getState).toHaveBeenCalled();
      setup.cleanup();
    });
  });

  describe('disabledActions$', () => {
    it('disables undo and redo when hasOverlays$ becomes true', async () => {
      const setup = await makeSetup();
      await pushStateChange(setup, 'Change 1');
      await waitFor(async () =>
        expect(await firstValueFrom(setup.api.disabledActions$)).toEqual({
          undo: false,
          redo: true,
        })
      );

      setup.hasOverlays$.next(true);
      expect(await firstValueFrom(setup.api.disabledActions$)).toEqual({
        undo: true,
        redo: true,
      });
      setup.cleanup();
    });

    it('disables undo and redo when dataLoading$ becomes true', async () => {
      const setup = await makeSetup();
      await pushStateChange(setup, 'Change 1');
      expect(await firstValueFrom(setup.api.disabledActions$)).toEqual({
        undo: false,
        redo: true,
      });

      setup.dataLoading$.next(true);
      expect(await firstValueFrom(setup.api.disabledActions$)).toEqual({
        undo: true,
        redo: true,
      });
      setup.cleanup();
    });

    it('re-enables undo once overlays are dismissed', async () => {
      const setup = await makeSetup();
      await pushStateChange(setup, 'Change 1');
      expect((await firstValueFrom(setup.api.disabledActions$)).undo).toEqual(false);
      setup.hasOverlays$.next(true);
      expect((await firstValueFrom(setup.api.disabledActions$)).undo).toEqual(true);
      setup.hasOverlays$.next(false);
      expect((await firstValueFrom(setup.api.disabledActions$)).undo).toEqual(false);
      setup.cleanup();
    });
  });

  describe('undo', () => {
    it('calls setState with the previous state', async () => {
      const setup = await makeSetup();
      await pushStateChange(setup, 'Change 1');
      expect(await firstValueFrom(setup.api.disabledActions$)).toEqual({
        undo: false,
        redo: true,
      });
      setup.api.undo();
      expect(setup.setState).toBeCalledWith(setup.initialState); // undo called
      setup.cleanup();
    });

    it('does not call setState when overlays are open', async () => {
      const setup = await makeSetup();
      await pushStateChange(setup, 'Change 1');
      expect(await firstValueFrom(setup.api.disabledActions$)).toEqual({
        undo: false,
        redo: true,
      });

      setup.hasOverlays$.next(true); // disableUndoRedo$ set to true synchronously
      setup.api.undo(); // blocked — returns early without emitting
      expect(setup.setState).not.toHaveBeenCalled();
      setup.cleanup();
    });

    it('does not call setState when there is no history', async () => {
      const setup = await makeSetup();
      setup.api.undo(); // pointer <= -1, returns early
      expect(setup.setState).not.toHaveBeenCalled();
      setup.cleanup();
    });
  });

  describe('redo', () => {
    it('calls setState with the re-applied state after an undo', async () => {
      const setup = await makeSetup();
      await pushStateChange(setup, 'Change 1');
      setup.api.undo();
      expect(setup.setState).toBeCalledWith(setup.initialState); // undo called
      setup.api.redo();
      expect(setup.setState).toBeCalledWith({ ...setup.initialState, title: 'Change 1' }); // undo called
      setup.cleanup();
    });
  });

  describe('cleanup', () => {
    it('stops pushing state to history after cleanup', async () => {
      const setup = await makeSetup();
      setup.cleanup();
      // Subscription gone — no debounce timer starts, getState is never called.
      setup.anyStateChange$.next(undefined);
      expect(setup.getState).not.toHaveBeenCalled();
    });
  });

  describe('panel sorting', () => {
    it('treats panels in different order as identical, producing no spurious diff', async () => {
      const setup = await makeSetup();
      const panelA = { id: 'a', type: 'test', grid: { x: 0, y: 0, w: 6, h: 6 }, config: {} };
      const panelB = { id: 'b', type: 'test', grid: { x: 6, y: 0, w: 6, h: 6 }, config: {} };
      // push [b, a] — sorted to [a, b] before diffing; creates one history entry.
      setup.stateRef.current = {
        ...setup.initialState,
        panels: [panelB, panelA],
      } as unknown as DashboardState;
      setup.anyStateChange$.next(undefined);
      await waitFor(() => expect(setup.getState).toBeCalledTimes(1));

      // aait for undo to be enabled — confirms exactly one history entry was recorded.
      expect(await firstValueFrom(setup.api.disabledActions$)).toEqual({
        undo: false,
        redo: true,
      });

      // push [a, b] — still [a, b] after sorting; no diff, no new history entry.
      setup.stateRef.current = {
        ...setup.initialState,
        panels: [panelA, panelB],
      } as unknown as DashboardState;
      setup.anyStateChange$.next(undefined);
      await waitFor(() => expect(setup.getState).toBeCalledTimes(2));

      // one undo must exhaust the stack (pointer → -1).
      const afterUndo = firstValueFrom(setup.api.disabledActions$.pipe(skip(1)));
      setup.api.undo();
      expect(await afterUndo).toMatchObject({ undo: true });
      setup.cleanup();
    });
  });
});
