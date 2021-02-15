/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSessionStateContainer, SessionState } from './session_state';

describe('Session state container', () => {
  const { stateContainer: state } = createSessionStateContainer();

  afterEach(() => {
    state.transitions.clear();
  });

  describe('transitions', () => {
    test('start', () => {
      state.transitions.start();
      expect(state.selectors.getState()).toBe(SessionState.None);
      expect(state.get().sessionId).not.toBeUndefined();
    });

    test('track', () => {
      expect(() => state.transitions.trackSearch({})).toThrowError();

      state.transitions.start();
      state.transitions.trackSearch({});

      expect(state.selectors.getState()).toBe(SessionState.Loading);
    });

    test('untrack', () => {
      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.Loading);
      state.transitions.unTrackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.Completed);
    });

    test('clear', () => {
      state.transitions.start();
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SessionState.None);
      expect(state.get().sessionId).toBeUndefined();
    });

    test('cancel', () => {
      expect(() => state.transitions.cancel()).toThrowError();

      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.Loading);
      state.transitions.cancel();
      expect(state.selectors.getState()).toBe(SessionState.Canceled);
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SessionState.None);
    });

    test('store -> completed', () => {
      expect(() => state.transitions.store()).toThrowError();

      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.Loading);
      state.transitions.store();
      expect(state.selectors.getState()).toBe(SessionState.BackgroundLoading);
      state.transitions.unTrackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.BackgroundCompleted);
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SessionState.None);
    });
    test('store -> cancel', () => {
      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.Loading);
      state.transitions.store();
      expect(state.selectors.getState()).toBe(SessionState.BackgroundLoading);
      state.transitions.cancel();
      expect(state.selectors.getState()).toBe(SessionState.Canceled);

      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.Canceled);

      state.transitions.start();
      expect(state.selectors.getState()).toBe(SessionState.None);
    });

    test('restore', () => {
      const id = 'id';
      state.transitions.restore(id);
      expect(state.selectors.getState()).toBe(SessionState.None);
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SessionState.BackgroundLoading);
      state.transitions.unTrackSearch(search);

      expect(state.selectors.getState()).toBe(SessionState.Restored);
      expect(() => state.transitions.store()).toThrowError();
      expect(state.selectors.getState()).toBe(SessionState.Restored);
      expect(() => state.transitions.cancel()).toThrowError();
      expect(state.selectors.getState()).toBe(SessionState.Restored);

      state.transitions.start();
      expect(state.selectors.getState()).toBe(SessionState.None);
    });
  });
});
