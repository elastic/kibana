/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createSessionStateContainer, SearchSessionState } from './search_session_state';

describe('Session state container', () => {
  const { stateContainer: state } = createSessionStateContainer();

  afterEach(() => {
    state.transitions.clear();
  });

  describe('transitions', () => {
    test('start', () => {
      state.transitions.start();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
      expect(state.get().sessionId).not.toBeUndefined();
      expect(state.get().startTime).not.toBeUndefined();
    });

    test('track', () => {
      expect(() => state.transitions.trackSearch({})).toThrowError();

      state.transitions.start();
      state.transitions.trackSearch({});

      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
    });

    test('untrack', () => {
      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.unTrackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Completed);
    });

    test('clear', () => {
      state.transitions.start();
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
      expect(state.get().sessionId).toBeUndefined();
      expect(state.get().startTime).toBeUndefined();
    });

    test('cancel', () => {
      expect(() => state.transitions.cancel()).toThrowError();

      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.cancel();
      expect(state.selectors.getState()).toBe(SearchSessionState.Canceled);
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
    });

    test('store -> completed', () => {
      expect(() => state.transitions.store()).toThrowError();

      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.store();
      expect(state.selectors.getState()).toBe(SearchSessionState.BackgroundLoading);
      state.transitions.unTrackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.BackgroundCompleted);
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
    });
    test('store -> cancel', () => {
      state.transitions.start();
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.store();
      expect(state.selectors.getState()).toBe(SearchSessionState.BackgroundLoading);
      state.transitions.cancel();
      expect(state.selectors.getState()).toBe(SearchSessionState.Canceled);

      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Canceled);

      state.transitions.start();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
    });

    test('restore', () => {
      const id = 'id';
      state.transitions.restore(id);
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.BackgroundLoading);
      state.transitions.unTrackSearch(search);

      expect(state.selectors.getState()).toBe(SearchSessionState.Restored);
      expect(() => state.transitions.store()).toThrowError();
      expect(state.selectors.getState()).toBe(SearchSessionState.Restored);
      expect(() => state.transitions.cancel()).toThrowError();
      expect(state.selectors.getState()).toBe(SearchSessionState.Restored);

      state.transitions.start();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
    });
  });
});
