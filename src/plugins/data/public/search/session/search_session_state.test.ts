/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSessionStateContainer, SearchSessionState } from './search_session_state';
import type { SearchSessionSavedObject } from './sessions_client';
import { SearchSessionStatus } from '../../../common';

const mockSavedObject: SearchSessionSavedObject = {
  id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
  type: 'search-session',
  attributes: {
    name: 'my_name',
    appId: 'my_app_id',
    locatorId: 'my_url_generator_id',
    idMapping: {},
    sessionId: 'session_id',
    touched: new Date().toISOString(),
    created: new Date().toISOString(),
    expires: new Date().toISOString(),
    status: SearchSessionStatus.COMPLETE,
    persisted: true,
    version: '8.0.0',
  },
  references: [],
};

describe('Session state container', () => {
  const appName = 'appName';
  const { stateContainer: state } = createSessionStateContainer();

  afterEach(() => {
    state.transitions.clear();
  });

  describe('transitions', () => {
    test('start', () => {
      state.transitions.start({ appName });
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
      expect(state.get().sessionId).not.toBeUndefined();
      expect(state.get().startTime).not.toBeUndefined();
      expect(state.get().appName).toBe(appName);
    });

    test('track', () => {
      expect(() => state.transitions.trackSearch({})).toThrowError();

      state.transitions.start({ appName });
      state.transitions.trackSearch({});

      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
    });

    test('untrack', () => {
      state.transitions.start({ appName });
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.unTrackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Completed);
    });

    test('clear', () => {
      state.transitions.start({ appName });
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
      expect(state.get().sessionId).toBeUndefined();
      expect(state.get().startTime).toBeUndefined();
      expect(state.get().appName).toBeUndefined();
    });

    test('cancel', () => {
      expect(() => state.transitions.cancel()).toThrowError();

      state.transitions.start({ appName });
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.cancel();
      expect(state.selectors.getState()).toBe(SearchSessionState.Canceled);
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
    });

    test('store -> completed', () => {
      expect(() => state.transitions.store(mockSavedObject)).toThrowError();

      state.transitions.start({ appName });
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.store(mockSavedObject);
      expect(state.selectors.getState()).toBe(SearchSessionState.BackgroundLoading);
      state.transitions.unTrackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.BackgroundCompleted);
      state.transitions.clear();
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
    });
    test('store -> cancel', () => {
      state.transitions.start({ appName });
      const search = {};
      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Loading);
      state.transitions.store(mockSavedObject);
      expect(state.selectors.getState()).toBe(SearchSessionState.BackgroundLoading);
      state.transitions.cancel();
      expect(state.selectors.getState()).toBe(SearchSessionState.Canceled);

      state.transitions.trackSearch(search);
      expect(state.selectors.getState()).toBe(SearchSessionState.Canceled);

      state.transitions.start({ appName });
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
      expect(() => state.transitions.store(mockSavedObject)).toThrowError();
      expect(state.selectors.getState()).toBe(SearchSessionState.Restored);
      expect(() => state.transitions.cancel()).toThrowError();
      expect(state.selectors.getState()).toBe(SearchSessionState.Restored);

      state.transitions.start({ appName });
      expect(state.selectors.getState()).toBe(SearchSessionState.None);
    });
  });
});
