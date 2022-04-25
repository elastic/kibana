/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMockContext } from '@kbn/expressions-plugin/common';
import { functionWrapper } from './utils';
import { phraseFilterFunction } from './phrase_filter';

describe('interpreter/functions#phraseFilter', () => {
  const fn = functionWrapper(phraseFilterFunction);

  it('returns an object with the correct structure', () => {
    const actual = fn(
      null,
      { field: { spec: { name: 'test' } }, phrase: ['test', 'something'] },
      createMockContext()
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
