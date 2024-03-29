/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import { fetchIndexPattern } from '../../../../common/index_patterns_utils';
import {
  getCachedIndexPatternFetcher,
  CachedIndexPatternFetcher,
} from './cached_index_pattern_fetcher';

jest.mock('../../../../common/index_patterns_utils');

describe('CachedIndexPatternFetcher', () => {
  let mockedIndices: DataView[] | [];
  let cachedIndexPatternFetcher: CachedIndexPatternFetcher;

  beforeEach(() => {
    mockedIndices = [];

    const indexPatternsService = {
      getDefault: jest.fn(() => Promise.resolve({ id: 'default', title: 'index' })),
      get: jest.fn(() => Promise.resolve(mockedIndices[0])),
      find: jest.fn(() => Promise.resolve(mockedIndices || [])),
    } as unknown as DataViewsService;

    (fetchIndexPattern as jest.Mock).mockClear();

    cachedIndexPatternFetcher = getCachedIndexPatternFetcher(indexPatternsService);
  });

  test('should return default index on no input value', async () => {
    const value = await cachedIndexPatternFetcher('');
    expect(value).toMatchInlineSnapshot(`
      Object {
        "indexPattern": Object {
          "id": "default",
          "title": "index",
        },
        "indexPatternString": "index",
      }
    `);
  });

  describe('text-based index', () => {
    test('should return only indexPatternString', async () => {
      const value = await cachedIndexPatternFetcher('indexTitle');

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPattern": undefined,
          "indexPatternString": "indexTitle",
        }
      `);
    });

    test('should cache once', async () => {
      await cachedIndexPatternFetcher('indexTitle');
      await cachedIndexPatternFetcher('indexTitle');
      await cachedIndexPatternFetcher('indexTitle');

      expect(fetchIndexPattern as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('object-based index', () => {
    test('should return the Kibana index if it exists', async () => {
      mockedIndices = [
        {
          id: 'indexId',
          title: 'indexTitle',
        },
      ] as DataView[];

      const value = await cachedIndexPatternFetcher({ id: 'indexId' });

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPattern": Object {
            "id": "indexId",
            "title": "indexTitle",
          },
          "indexPatternString": "indexTitle",
        }
      `);
    });

    test('should return default index if Kibana index not found', async () => {
      const value = await cachedIndexPatternFetcher({ id: 'indexId' });

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPattern": undefined,
          "indexPatternString": "",
        }
      `);
    });

    test('should cache once', async () => {
      mockedIndices = [
        {
          id: 'indexId',
          title: 'indexTitle',
        },
      ] as DataView[];

      await cachedIndexPatternFetcher({ id: 'indexId' });
      await cachedIndexPatternFetcher({ id: 'indexId' });
      await cachedIndexPatternFetcher({ id: 'indexId' });

      expect(fetchIndexPattern as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });
});
