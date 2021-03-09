/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from 'src/plugins/expressions/common';
import { functionWrapper } from './utils';
import { phraseFilterFunction } from './phrase_filter';

describe('interpreter/functions#phraseFilter', () => {
  const fn = functionWrapper(phraseFilterFunction);
  let context: ExecutionContext;

  beforeEach(() => {
    context = {
      getSearchContext: () => ({}),
      getSearchSessionId: () => undefined,
      types: {},
      variables: {},
      abortSignal: {} as any,
      inspectorAdapters: {} as any,
    };
  });

  it('returns an object with the correct structure', () => {
    const actual = fn(
      null,
      { field: { spec: { name: 'test' } }, phrase: ['test', 'something'] },
      context
    );
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "alias": null,
          "disabled": false,
          "index": undefined,
          "key": "test",
          "negate": false,
          "params": Array [
            "test",
            "something",
          ],
          "type": "phrases",
          "value": "test, something",
        },
        "query": Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "match_phrase": Object {
                  "test": "test",
                },
              },
              Object {
                "match_phrase": Object {
                  "test": "something",
                },
              },
            ],
          },
        },
        "type": "kibana_filter",
      }
    `);
  });
});
