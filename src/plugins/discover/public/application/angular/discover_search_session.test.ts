/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { DiscoverSearchSessionManager } from './discover_search_session';
import { createMemoryHistory } from 'history';
import { dataPluginMock } from '../../../../data/public/mocks';
import { DataPublicPluginStart } from '../../../../data/public';

describe('DiscoverSearchSessionManager', () => {
  const history = createMemoryHistory();
  const session = dataPluginMock.createStartContract().search.session as jest.Mocked<
    DataPublicPluginStart['search']['session']
  >;
  const searchSessionManager = new DiscoverSearchSessionManager({
    history,
    session,
  });

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
