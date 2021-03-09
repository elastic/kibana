/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern, IndexPatternsService } from 'src/plugins/data/server';
import { getIndexPatternObject } from './get_index_pattern';

describe('getIndexPatternObject', () => {
  let mockedIndices: IndexPattern[] | [];

  const indexPatternsService = ({
    getDefault: jest.fn(() => Promise.resolve({ id: 'default', title: 'index' })),
    get: jest.fn(() => Promise.resolve(mockedIndices[0])),
    find: jest.fn(() => Promise.resolve(mockedIndices || [])),
  } as unknown) as IndexPatternsService;

  beforeEach(() => {
    mockedIndices = [];
  });

  test('should return default index on no input value', async () => {
    const value = await getIndexPatternObject('', { indexPatternsService });
    expect(value).toMatchInlineSnapshot(`
      Object {
        "indexPatternObject": Object {
          "id": "default",
          "title": "index",
        },
        "indexPatternString": "index",
      }
    `);
  });

  describe('text-based index', () => {
    test('should return the Kibana index if it exists', async () => {
      mockedIndices = [
        {
          id: 'indexId',
          title: 'indexTitle',
        },
      ] as IndexPattern[];

      const value = await getIndexPatternObject('indexTitle', { indexPatternsService });

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPatternObject": Object {
            "id": "indexId",
            "title": "indexTitle",
          },
          "indexPatternString": "indexTitle",
        }
      `);
    });

    test('should return only indexPatternString if Kibana index does not exist', async () => {
      const value = await getIndexPatternObject('indexTitle', { indexPatternsService });

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPatternObject": undefined,
          "indexPatternString": "indexTitle",
        }
      `);
    });
  });

  describe('object-based index', () => {
    test('should return the Kibana index if it exists', async () => {
      mockedIndices = [
        {
          id: 'indexId',
          title: 'indexTitle',
        },
      ] as IndexPattern[];

      const value = await getIndexPatternObject({ id: 'indexId' }, { indexPatternsService });

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPatternObject": Object {
            "id": "indexId",
            "title": "indexTitle",
          },
          "indexPatternString": "indexTitle",
        }
      `);
    });

    test('should return default index if Kibana index not found', async () => {
      const value = await getIndexPatternObject(
        { id: 'indexId', title: 'title' },
        { indexPatternsService }
      );

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPatternObject": Object {
            "id": "default",
            "title": "index",
          },
          "indexPatternString": "index",
        }
      `);
    });
  });
});
