/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppStateUrl } from '../services/discover_app_state_container';
import { cleanupUrlState } from './cleanup_url_state';
import { createDiscoverServicesMock } from '../../../__mocks__/services';

const services = createDiscoverServicesMock();

describe('cleanupUrlState', () => {
  test('cleaning up legacy sort', async () => {
    const state = { sort: ['batman', 'desc'] } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
      Object {
        "sort": Array [
          Array [
            "batman",
            "desc",
          ],
        ],
      }
    `);
  });
  test('not cleaning up broken legacy sort', async () => {
    const state = { sort: ['batman'] } as unknown as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });
  test('not cleaning up regular sort', async () => {
    const state = {
      sort: [
        ['batman', 'desc'],
        ['robin', 'asc'],
      ],
    } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
      Object {
        "sort": Array [
          Array [
            "batman",
            "desc",
          ],
          Array [
            "robin",
            "asc",
          ],
        ],
      }
    `);
  });
  test('removing empty sort', async () => {
    const state = {
      sort: [],
    } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });

  test('should keep a valid rowsPerPage', async () => {
    const state = {
      rowsPerPage: 50,
    } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
      Object {
        "rowsPerPage": 50,
      }
    `);
  });

  test('should remove a negative rowsPerPage', async () => {
    const state = {
      rowsPerPage: -50,
    } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });

  test('should remove an invalid rowsPerPage', async () => {
    const state = {
      rowsPerPage: 'test',
    } as unknown as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });

  describe('sampleSize', function () {
    test('should keep a valid sampleSize', async () => {
      const state = {
        sampleSize: 50,
      } as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
              Object {
                "sampleSize": 50,
              }
          `);
    });

    test('should remove for ES|QL', async () => {
      const state = {
        sampleSize: 50,
        query: {
          esql: 'from test',
        },
      } as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
        Object {
          "query": Object {
            "esql": "from test",
          },
        }
      `);
    });

    test('should remove a negative sampleSize', async () => {
      const state = {
        sampleSize: -50,
      } as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
    });

    test('should remove an invalid sampleSize', async () => {
      const state = {
        sampleSize: 'test',
      } as unknown as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
    });

    test('should remove a too large sampleSize', async () => {
      const state = {
        sampleSize: 500000,
      } as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
    });
  });
});
