/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { buildSearchBody, useEsDocSearch } from './use_es_doc_search';
import { Observable } from 'rxjs';
import { IndexPattern } from 'src/plugins/data/common';
import { DocProps } from '../apps/doc/components/doc';
import { ElasticRequestState } from '../apps/doc/types';
import { SEARCH_FIELDS_FROM_SOURCE as mockSearchFieldsFromSource } from '../../../common';

const mockSearchResult = new Observable();

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    data: {
      search: {
        search: jest.fn(() => {
          return mockSearchResult;
        }),
      },
    },
    uiSettings: {
      get: (key: string) => {
        if (key === mockSearchFieldsFromSource) {
          return false;
        }
      },
    },
  }),
}));

describe('Test of <Doc /> helper / hook', () => {
  test('buildSearchBody given useNewFieldsApi is false', () => {
    const indexPattern = {
      getComputedFields: () => ({ storedFields: [], scriptFields: [], docvalueFields: [] }),
    } as unknown as IndexPattern;
    const actual = buildSearchBody('1', indexPattern, false);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "_source": true,
          "fields": Array [],
          "query": Object {
            "ids": Object {
              "values": Array [
                "1",
              ],
            },
          },
          "script_fields": Array [],
          "stored_fields": Array [],
          "version": true,
        },
      }
    `);
  });

  test('buildSearchBody useNewFieldsApi is true', () => {
    const indexPattern = {
      getComputedFields: () => ({ storedFields: [], scriptFields: [], docvalueFields: [] }),
    } as unknown as IndexPattern;
    const actual = buildSearchBody('1', indexPattern, true);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "fields": Array [
            Object {
              "field": "*",
              "include_unmapped": "true",
            },
          ],
          "query": Object {
            "ids": Object {
              "values": Array [
                "1",
              ],
            },
          },
          "runtime_mappings": Object {},
          "script_fields": Array [],
          "stored_fields": Array [],
          "version": true,
        },
      }
    `);
  });

  test('buildSearchBody with requestSource', () => {
    const indexPattern = {
      getComputedFields: () => ({ storedFields: [], scriptFields: [], docvalueFields: [] }),
    } as unknown as IndexPattern;
    const actual = buildSearchBody('1', indexPattern, true, true);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "_source": true,
          "fields": Array [
            Object {
              "field": "*",
              "include_unmapped": "true",
            },
          ],
          "query": Object {
            "ids": Object {
              "values": Array [
                "1",
              ],
            },
          },
          "runtime_mappings": Object {},
          "script_fields": Array [],
          "stored_fields": Array [],
          "version": true,
        },
      }
    `);
  });

  test('buildSearchBody with runtime fields', () => {
    const indexPattern = {
      getComputedFields: () => ({
        storedFields: [],
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
    } as unknown as IndexPattern;
    const actual = buildSearchBody('1', indexPattern, true);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "fields": Array [
            Object {
              "field": "*",
              "include_unmapped": "true",
            },
          ],
          "query": Object {
            "ids": Object {
              "values": Array [
                "1",
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
          "stored_fields": Array [],
          "version": true,
        },
      }
    `);
  });

  test('useEsDocSearch', async () => {
    const indexPattern = {
      getComputedFields: () => [],
    };
    const getMock = jest.fn(() => Promise.resolve(indexPattern));
    const indexPatternService = {
      get: getMock,
    } as unknown as IndexPattern;
    const props = {
      id: '1',
      index: 'index1',
      indexPatternId: 'xyz',
      indexPatternService,
    } as unknown as DocProps;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hook: any;
    await act(async () => {
      hook = renderHook((p: DocProps) => useEsDocSearch(p), { initialProps: props });
    });
    expect(hook.result.current.slice(0, 3)).toEqual([
      ElasticRequestState.Loading,
      null,
      indexPattern,
    ]);
    expect(getMock).toHaveBeenCalled();
  });
});
