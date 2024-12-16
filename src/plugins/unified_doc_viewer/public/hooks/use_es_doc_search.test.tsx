/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, renderHook, act } from '@testing-library/react';
import { type EsDocSearchProps, buildSearchBody, useEsDocSearch } from './use_es_doc_search';
import { Subject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { setUnifiedDocViewerServices } from '../plugin';
import { UnifiedDocViewerServices } from '../types';

const index = 'test-index';
const mockSearchResult = new Subject();
setUnifiedDocViewerServices({
  data: {
    search: {
      search: jest.fn(() => {
        return mockSearchResult;
      }),
    },
  },
} as unknown as UnifiedDocViewerServices);

describe('Test of <Doc /> helper / hook', () => {
  test('buildSearchBody with _source', () => {
    const dataView = {
      getComputedFields: () => ({ scriptFields: [], docvalueFields: [] }),
    } as unknown as DataView;
    const actual = buildSearchBody('1', index, dataView);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "_source": true,
          "fields": Array [
            Object {
              "field": "*",
              "include_unmapped": true,
            },
          ],
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "ids": Object {
                    "values": Array [
                      "1",
                    ],
                  },
                },
                Object {
                  "term": Object {
                    "_index": "test-index",
                  },
                },
              ],
            },
          },
          "runtime_mappings": Object {},
          "script_fields": Array [],
          "stored_fields": Array [
            "*",
          ],
          "version": true,
        },
      }
    `);
  });

  test('buildSearchBody with runtime fields', () => {
    const dataView = {
      getComputedFields: () => ({
        scriptFields: [],
        docvalueFields: [],
        runtimeFields: {
          myRuntimeField: {
            type: 'double',
            script: {
              source: 'emit(10.0)',
            },
          },
        },
      }),
    } as unknown as DataView;
    const actual = buildSearchBody('1', index, dataView);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "_source": true,
          "fields": Array [
            Object {
              "field": "*",
              "include_unmapped": true,
            },
          ],
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "ids": Object {
                    "values": Array [
                      "1",
                    ],
                  },
                },
                Object {
                  "term": Object {
                    "_index": "test-index",
                  },
                },
              ],
            },
          },
          "runtime_mappings": Object {
            "myRuntimeField": Object {
              "script": Object {
                "source": "emit(10.0)",
              },
              "type": "double",
            },
          },
          "script_fields": Array [],
          "stored_fields": Array [
            "*",
          ],
          "version": true,
        },
      }
    `);
  });

  test('useEsDocSearch loading', async () => {
    const dataView = {
      getComputedFields: () => [],
      getIndexPattern: () => index,
    };
    const props = {
      id: '1',
      index: 'index1',
      dataView,
    } as unknown as EsDocSearchProps;

    const hook = renderHook((p: EsDocSearchProps) => useEsDocSearch(p), {
      initialProps: props,
    });

    expect(hook.result.current.slice(0, 2)).toEqual([ElasticRequestState.Loading, null]);
  });

  test('useEsDocSearch ignore partial results', async () => {
    const dataView = {
      getComputedFields: () => [],
      getIndexPattern: () => index,
    };

    const record = { _id: '1', _index: 't', test: 1 };

    const props = {
      id: '1',
      index: 'index1',
      dataView,
    } as unknown as EsDocSearchProps;

    const hook = renderHook((p: EsDocSearchProps) => useEsDocSearch(p), {
      initialProps: props,
    });

    await act(async () => {
      mockSearchResult.next({
        isPartial: true,
        isRunning: false,
        rawResponse: {
          hits: {
            hits: [],
          },
        },
      });
      mockSearchResult.next({
        isPartial: false,
        isRunning: false,
        rawResponse: {
          hits: {
            hits: [record],
          },
        },
      });
      mockSearchResult.complete();
    });

    await waitFor(() =>
      expect(hook.result.current.slice(0, 2)).toEqual([
        ElasticRequestState.Found,
        buildDataTableRecord(record),
      ])
    );
  });

  test('useEsDocSearch for text based languages', async () => {
    const dataView = {
      getComputedFields: () => [],
      getIndexPattern: () => index,
    };
    const props = {
      id: '1',
      index: 'index1',
      dataView,
      textBasedHits: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1, field2: 2 },
        },
      ],
    } as unknown as EsDocSearchProps;

    const hook = renderHook((p: EsDocSearchProps) => useEsDocSearch(p), {
      initialProps: props,
    });

    expect(hook.result.current.slice(0, 2)).toEqual([
      ElasticRequestState.Found,
      {
        id: '1',
        raw: { field1: 1, field2: 2 },
        flattened: { field1: 1, field2: 2 },
      },
    ]);
  });
});
