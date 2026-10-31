/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchSessionMock } from '../../../__mocks__/search_session';

describe('DiscoverSearchSessionManager', () => {
  const { history, session, searchSessionManager } = createSearchSessionMock();

  beforeEach(() => {
    history.push('/');
    session.start.mockReset();
    session.restore.mockReset();
    session.getSessionId.mockReset();
    session.isCurrentSession.mockReset();
    session.isRestore.mockReset();
  });

  describe('getNextSearchSessionId', () => {
    test('starts a new session', () => {
      const nextId = 'id';
      session.start.mockImplementationOnce(() => nextId);

      const { searchSessionId, isSearchSessionRestored } =
        searchSessionManager.getNextSearchSessionId();
      expect(searchSessionId).toEqual(nextId);
      expect(isSearchSessionRestored).toBe(false);
      expect(session.start).toHaveBeenCalled();
    });

    test('restores a session using query param from the URL', () => {
      const nextId = 'id_from_url';
      history.push(`/?searchSessionId=${nextId}`);

      const { searchSessionId, isSearchSessionRestored } =
        searchSessionManager.getNextSearchSessionId();
      expect(searchSessionId).toEqual(nextId);
      expect(isSearchSessionRestored).toBe(true);
      expect(session.restore).toHaveBeenCalled();
    });

    test('removes query param from the URL when navigating away from a restored session', () => {
      const idFromUrl = 'id_from_url';
      history.push(`/?searchSessionId=${idFromUrl}`);

      const nextId = 'id';
      session.start.mockImplementationOnce(() => nextId);
      session.isCurrentSession.mockImplementationOnce(() => true);
      session.isRestore.mockImplementationOnce(() => true);

      const { searchSessionId, isSearchSessionRestored } =
        searchSessionManager.getNextSearchSessionId();
      expect(searchSessionId).toEqual(nextId);
      expect(isSearchSessionRestored).toBe(false);
      expect(session.start).toHaveBeenCalled();
      expect(history.location.search).toMatchInlineSnapshot(`""`);
    });
  });

  describe('newSearchSessionIdFromURL$', () => {
    test('notifies about searchSessionId changes in the URL', () => {
      const emits: Array<string | null> = [];

      const sub = searchSessionManager.getNewSearchSessionIdFromURL$().subscribe((newId) => {
        emits.push(newId);
      });

      history.push(`/?searchSessionId=id1`);
      history.push(`/?searchSessionId=id1`);
      session.isCurrentSession.mockImplementationOnce(() => true);
      history.replace(`/?searchSessionId=id2`); // should skip current this
      history.replace(`/`);
      history.push(`/?searchSessionId=id1`);
      history.push(`/`);

      expect(emits).toMatchInlineSnapshot(`
        Array [
          "id1",
          null,
          "id1",
          null,
        ]
      `);

      sub.unsubscribe();
    });
  });
});

describe('DiscoverSearchSessionManager replay cache', () => {
  const timeRangeAbsolute = { from: '2021-08-31T21:00:00.000Z', to: '2021-08-31T22:00:00.000Z' };
  const cachedTimeRange = {
    from: '2021-08-31T20:00:00.000Z',
    to: '2021-08-31T21:00:00.000Z',
    mode: 'absolute' as const,
  };
  const cachedReplay = {
    hit: true as const,
    sessionId: 'cached',
    timeRange: cachedTimeRange,
    lastFetched: '2021-08-31T21:00:00.000Z',
  };
  const params = { tabId: 'tab', initial: true, contextKey: 'context' };

  const setup = () => {
    const searchSessionMock = createSearchSessionMock();
    searchSessionMock.session.start.mockReturnValue('new');
    searchSessionMock.timefilter.getAbsoluteTime.mockReturnValue(timeRangeAbsolute);

    return searchSessionMock;
  };

  test('replays the cached session and time range on an initial load', () => {
    const { session, replayCache, searchSessionManager } = setup();
    replayCache.get.mockReturnValue(cachedReplay);

    expect(searchSessionManager.getTabSearchSession(params)).toEqual({
      searchSessionId: 'cached',
      isSearchSessionRestored: false,
      timeRangeAbsolute: cachedTimeRange,
    });
    expect(replayCache.get).toHaveBeenCalledWith('discover:tab', 'context');
    expect(session.continue).toHaveBeenCalledWith('cached');
    expect(session.start).not.toHaveBeenCalled();
  });

  test('starts and caches a new session when nothing is cached', () => {
    const { replayCache, searchSessionManager } = setup();

    expect(searchSessionManager.getTabSearchSession(params)).toEqual({
      searchSessionId: 'new',
      isSearchSessionRestored: false,
      timeRangeAbsolute,
    });
    expect(replayCache.set).toHaveBeenCalledWith('discover:tab', {
      sessionId: 'new',
      timeRange: { ...timeRangeAbsolute, mode: 'absolute' },
      contextKey: 'context',
    });
  });

  test('reads the time range of a new session after starting it', () => {
    const { session, timefilter, searchSessionManager } = setup();
    const staleTimeRange = { from: '2021-08-31T20:30:00.000Z', to: '2021-08-31T21:30:00.000Z' };
    timefilter.getAbsoluteTime.mockReturnValue(staleTimeRange);
    session.start.mockImplementation(() => {
      timefilter.getAbsoluteTime.mockReturnValue(timeRangeAbsolute);

      return 'new';
    });

    expect(searchSessionManager.getTabSearchSession(params).timeRangeAbsolute).toEqual(
      timeRangeAbsolute
    );
  });

  test('starts a new session after the initial load', () => {
    const { replayCache, searchSessionManager } = setup();
    replayCache.get.mockReturnValue(cachedReplay);

    const { searchSessionId } = searchSessionManager.getTabSearchSession({
      ...params,
      initial: false,
    });

    expect(searchSessionId).toBe('new');
    expect(replayCache.get).not.toHaveBeenCalled();
  });

  test('restores the session from the URL and discards the cached tab', () => {
    const { history, replayCache, searchSessionManager } = setup();
    replayCache.get.mockReturnValue(cachedReplay);
    history.push('/?searchSessionId=id_from_url');

    expect(searchSessionManager.getTabSearchSession(params)).toEqual({
      searchSessionId: 'id_from_url',
      isSearchSessionRestored: true,
      timeRangeAbsolute,
    });
    expect(replayCache.set).not.toHaveBeenCalled();
    expect(replayCache.delete).toHaveBeenCalledWith('discover:tab');
  });

  test('forgetTab discards the cached session of the tab', () => {
    const { replayCache, searchSessionManager } = setup();

    searchSessionManager.forgetTab('tab');

    expect(replayCache.delete).toHaveBeenCalledWith('discover:tab');
  });

  test('reports the replayed session only while it is current', () => {
    const { session, replayCache, searchSessionManager } = setup();
    replayCache.get.mockReturnValue(cachedReplay);
    searchSessionManager.getTabSearchSession(params);

    session.isCurrentSession.mockImplementation((sessionId) => sessionId === 'cached');
    expect(searchSessionManager.isCurrentSessionReplayed()).toBe(true);

    session.isCurrentSession.mockImplementation((sessionId) => sessionId === 'new');
    expect(searchSessionManager.isCurrentSessionReplayed()).toBe(false);
  });

  test('keeps reporting a tab replay after another tab replays its own session', () => {
    const { session, replayCache, searchSessionManager } = setup();
    replayCache.get
      .mockReturnValueOnce({ ...cachedReplay, sessionId: 'first-session' })
      .mockReturnValueOnce({ ...cachedReplay, sessionId: 'second-session' });
    searchSessionManager.getTabSearchSession({ ...params, tabId: 'first-tab' });
    searchSessionManager.getTabSearchSession({ ...params, tabId: 'second-tab' });

    session.isCurrentSession.mockImplementation((sessionId) => sessionId === 'first-session');

    expect(searchSessionManager.isCurrentSessionReplayed()).toBe(true);
  });
});
