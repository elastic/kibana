/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { buildSearchBody, useEsDocSearch, ElasticRequestState } from './use_es_doc_search';
import { DocProps } from './doc';

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
      esClient: { search: jest.fn(() => new Promise(() => {})) },
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
