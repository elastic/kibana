/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { buildSearchBody, useEsDocSearch, ElasticRequestState } from './use_es_doc_search';
import { DocProps } from './doc';
import { Observable } from 'rxjs';
import { SEARCH_FIELDS_FROM_SOURCE as mockSearchFieldsFromSource } from '../../../../common';

const mockSearchResult = new Observable();

jest.mock('../../../kibana_services', () => ({
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
    } as any;
    const actual = buildSearchBody('1', indexPattern, false);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "_source": true,
        "docvalue_fields": Array [],
        "fields": undefined,
        "query": Object {
          "ids": Object {
            "values": Array [
              "1",
            ],
          },
        },
        "script_fields": Array [],
        "stored_fields": Array [],
      }
    `);
  });

  test('buildSearchBody useNewFieldsApi is true', () => {
    const indexPattern = {
      getComputedFields: () => ({ storedFields: [], scriptFields: [], docvalueFields: [] }),
    } as any;
    const actual = buildSearchBody('1', indexPattern, true);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "_source": false,
        "docvalue_fields": Array [],
        "fields": Array [
          "*",
        ],
        "query": Object {
          "ids": Object {
            "values": Array [
              "1",
            ],
          },
        },
        "script_fields": Array [],
        "stored_fields": Array [],
      }
    `);
  });

  test('useEsDocSearch', async () => {
    const indexPattern = {
      getComputedFields: () => [],
    };
    const indexPatternService = {
      get: jest.fn(() => Promise.resolve(indexPattern)),
    } as any;
    const props = {
      id: '1',
      index: 'index1',
      indexPatternId: 'xyz',
      indexPatternService,
    } as DocProps;
    let hook;
    await act(async () => {
      hook = renderHook((p: DocProps) => useEsDocSearch(p), { initialProps: props });
    });
    // @ts-ignore
    expect(hook.result.current).toEqual([ElasticRequestState.Loading, null, indexPattern]);
    expect(indexPatternService.get).toHaveBeenCalled();
  });
});
