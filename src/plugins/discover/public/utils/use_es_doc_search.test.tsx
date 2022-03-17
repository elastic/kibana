/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { buildSearchBody, useEsDocSearch } from './use_es_doc_search';
import { Observable } from 'rxjs';
import { DataView } from 'src/plugins/data_views/public';
import { DocProps } from '../application/doc/components/doc';
import { ElasticRequestState } from '../application/doc/types';
import { SEARCH_FIELDS_FROM_SOURCE as mockSearchFieldsFromSource } from '../../common';
import { KibanaContextProvider } from '../../../kibana_react/public';
import React from 'react';

const mockSearchResult = new Observable();

const services = {
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
};

describe('Test of <Doc /> helper / hook', () => {
  test('buildSearchBody given useNewFieldsApi is false', () => {
    const indexPattern = {
      getComputedFields: () => ({ storedFields: [], scriptFields: [], docvalueFields: [] }),
    } as unknown as DataView;
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
    } as unknown as DataView;
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
    } as unknown as DataView;
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
    } as unknown as DataView;
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
    const props = {
      id: '1',
      index: 'index1',
      indexPattern,
    } as unknown as DocProps;

    const { result } = renderHook((p: DocProps) => useEsDocSearch(p), {
      initialProps: props,
      wrapper: ({ children }) => (
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      ),
    });

    expect(result.current.slice(0, 2)).toEqual([ElasticRequestState.Loading, null]);
  });
});
