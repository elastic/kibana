/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppStateUrl } from '../discover_app_state_container';
import { cleanupUrlState } from './cleanup_url_state';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { DataSourceType } from '../../../../../common/data_sources';

const services = createDiscoverServicesMock();

describe('cleanupUrlState', () => {
  test('cleaning up legacy sort', () => {
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

  test('not cleaning up broken legacy sort', () => {
    const state = { sort: ['batman'] } as unknown as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });

  test('not cleaning up regular sort', () => {
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

  test('removing empty sort', () => {
    const state = {
      sort: [],
    } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });

  test('should keep a valid rowsPerPage', () => {
    const state = {
      rowsPerPage: 50,
    } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
      Object {
        "rowsPerPage": 50,
      }
    `);
  });

  test('should remove a negative rowsPerPage', () => {
    const state = {
      rowsPerPage: -50,
    } as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });

  test('should remove an invalid rowsPerPage', () => {
    const state = {
      rowsPerPage: 'test',
    } as unknown as AppStateUrl;
    expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
  });

  describe('sampleSize', function () {
    test('should keep a valid sampleSize', () => {
      const state = {
        sampleSize: 50,
      } as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
              Object {
                "sampleSize": 50,
              }
          `);
    });

    test('should remove for ES|QL', () => {
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

    test('should remove a negative sampleSize', () => {
      const state = {
        sampleSize: -50,
      } as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
    });

    test('should remove an invalid sampleSize', () => {
      const state = {
        sampleSize: 'test',
      } as unknown as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
    });

    test('should remove a too large sampleSize', () => {
      const state = {
        sampleSize: 500000,
      } as AppStateUrl;
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`Object {}`);
    });
  });

  describe('index', () => {
    it('should convert index to a data view dataSource', () => {
      const state: AppStateUrl = {
        index: 'test',
      };
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
        Object {
          "dataSource": Object {
            "dataViewId": "test",
            "type": "dataView",
          },
        }
      `);
    });

    it('should not override the dataSource if one is already set', () => {
      const state: AppStateUrl = {
        index: 'test',
        dataSource: {
          type: DataSourceType.DataView,
          dataViewId: 'test2',
        },
      };
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
        Object {
          "dataSource": Object {
            "dataViewId": "test2",
            "type": "dataView",
          },
        }
      `);
    });

    it('should set an ES|QL dataSource if the query is an ES|QL query', () => {
      const state: AppStateUrl = {
        index: 'test',
        query: {
          esql: 'from test',
        },
      };
      expect(cleanupUrlState(state, services.uiSettings)).toMatchInlineSnapshot(`
        Object {
          "dataSource": Object {
            "type": "esql",
          },
          "query": Object {
            "esql": "from test",
          },
        }
      `);
    });
  });
});
