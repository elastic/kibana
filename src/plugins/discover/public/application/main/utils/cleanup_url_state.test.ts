/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cleanupUrlState } from './cleanup_url_state';
import { AppStateUrl } from '../services/discover_state';

describe('cleanupUrlState', () => {
  test('cleaning up legacy sort', async () => {
    const state = { sort: ['batman', 'desc'] } as AppStateUrl;
    expect(cleanupUrlState(state)).toMatchInlineSnapshot(`
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
    expect(cleanupUrlState(state)).toMatchInlineSnapshot(`Object {}`);
  });
  test('not cleaning up regular sort', async () => {
    const state = {
      sort: [
        ['batman', 'desc'],
        ['robin', 'asc'],
      ],
    } as AppStateUrl;
    expect(cleanupUrlState(state)).toMatchInlineSnapshot(`
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
    expect(cleanupUrlState(state)).toMatchInlineSnapshot(`Object {}`);
  });

  test('should keep a valid rowsPerPage', async () => {
    const state = {
      rowsPerPage: 50,
    } as AppStateUrl;
    expect(cleanupUrlState(state)).toMatchInlineSnapshot(`
      Object {
        "rowsPerPage": 50,
      }
    `);
  });

  test('should remove a negative rowsPerPage', async () => {
    const state = {
      rowsPerPage: -50,
    } as AppStateUrl;
    expect(cleanupUrlState(state)).toMatchInlineSnapshot(`Object {}`);
  });

  test('should remove an invalid rowsPerPage', async () => {
    const state = {
      rowsPerPage: 'test',
    } as unknown as AppStateUrl;
    expect(cleanupUrlState(state)).toMatchInlineSnapshot(`Object {}`);
  });
});
