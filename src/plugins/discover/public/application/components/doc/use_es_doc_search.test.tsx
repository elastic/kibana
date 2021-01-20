/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { buildSearchBody, useEsDocSearch, ElasticRequestState } from './use_es_doc_search';
import { DocProps } from './doc';
import { Observable } from 'rxjs';

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
  }),
}));

describe('Test of <Doc /> helper / hook', () => {
  test('buildSearchBody', () => {
    const indexPattern = {
      getComputedFields: () => ({ storedFields: [], scriptFields: [], docvalueFields: [] }),
    } as any;
    const actual = buildSearchBody('1', indexPattern);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "_source": true,
        "docvalue_fields": Array [],
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
