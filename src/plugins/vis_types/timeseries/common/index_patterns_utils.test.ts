/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  extractIndexPatternValues,
  isStringTypeIndexPattern,
  fetchIndexPattern,
} from './index_patterns_utils';
import { Panel } from './types';
import type { DataView, DataViewsService } from '../../../data_views/public';

describe('isStringTypeIndexPattern', () => {
  test('should returns true on string-based index', () => {
    expect(isStringTypeIndexPattern('index')).toBeTruthy();
  });
  test('should returns false on object-based index', () => {
    expect(isStringTypeIndexPattern({ id: 'id' })).toBeFalsy();
  });
});

describe('extractIndexPatterns', () => {
  let panel: Panel;

  beforeEach(() => {
    panel = {
      index_pattern: '*',
      series: [
        {
          override_index_pattern: 1,
          series_index_pattern: 'example-1-*',
        },
        {
          override_index_pattern: 1,
          series_index_pattern: 'example-2-*',
        },
      ],
      annotations: [{ index_pattern: 'notes-*' }, { index_pattern: 'example-1-*' }],
    } as Panel;
  });

  test('should return index patterns', () => {
    expect(extractIndexPatternValues(panel, undefined)).toEqual([
      '*',
      'example-1-*',
      'example-2-*',
      'notes-*',
    ]);
  });
});

describe('fetchIndexPattern', () => {
  let mockedIndices: DataView[] | [];
  let indexPatternsService: DataViewsService;

  beforeEach(() => {
    mockedIndices = [];

    indexPatternsService = {
      getDefault: jest.fn(() => Promise.resolve({ id: 'default', title: 'index' })),
      get: jest.fn(() => Promise.resolve(mockedIndices[0])),
      find: jest.fn(() => Promise.resolve(mockedIndices || [])),
    } as unknown as DataViewsService;
  });

  test('should return default index on no input value', async () => {
    const value = await fetchIndexPattern('', indexPatternsService);
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
    test('should return the Kibana index if it exists (fetchKibabaIndexForStringIndexes is true)', async () => {
      mockedIndices = [
        {
          id: 'indexId',
          title: 'indexTitle',
        },
      ] as DataView[];

      const value = await fetchIndexPattern('indexTitle', indexPatternsService, {
        fetchKibanaIndexForStringIndexes: true,
      });

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

    test('should return only indexPatternString if Kibana index does not exist (fetchKibanaIndexForStringIndexes is true)', async () => {
      const value = await fetchIndexPattern('indexTitle', indexPatternsService, {
        fetchKibanaIndexForStringIndexes: true,
      });

      expect(value).toMatchInlineSnapshot(`
        Object {
          "indexPattern": undefined,
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
      ] as DataView[];

      const value = await fetchIndexPattern({ id: 'indexId' }, indexPatternsService);

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
  });
});
