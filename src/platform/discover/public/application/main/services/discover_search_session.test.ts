/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

      const id = searchSessionManager.getNextSearchSessionId();
      expect(id).toEqual(nextId);
      expect(session.start).toBeCalled();
    });

    test('restores a session using query param from the URL', () => {
      const nextId = 'id_from_url';
      history.push(`/?searchSessionId=${nextId}`);

      const id = searchSessionManager.getNextSearchSessionId();
      expect(id).toEqual(nextId);
      expect(session.restore).toBeCalled();
    });

    test('removes query param from the URL when navigating away from a restored session', () => {
      const idFromUrl = 'id_from_url';
      history.push(`/?searchSessionId=${idFromUrl}`);

      const nextId = 'id';
      session.start.mockImplementationOnce(() => nextId);
      session.isCurrentSession.mockImplementationOnce(() => true);
      session.isRestore.mockImplementationOnce(() => true);

      const id = searchSessionManager.getNextSearchSessionId();
      expect(id).toEqual(nextId);
      expect(session.start).toBeCalled();
      expect(history.location.search).toMatchInlineSnapshot(`""`);
    });
  });

  describe('newSearchSessionIdFromURL$', () => {
    test('notifies about searchSessionId changes in the URL', () => {
      const emits: Array<string | null> = [];

      const sub = searchSessionManager.newSearchSessionIdFromURL$.subscribe((newId) => {
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
