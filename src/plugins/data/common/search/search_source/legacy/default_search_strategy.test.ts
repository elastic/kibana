/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { defaultSearchStrategy } from './default_search_strategy';
import { LegacyFetchHandlers, SearchStrategySearchParams } from './types';
import { BehaviorSubject } from 'rxjs';

const { search } = defaultSearchStrategy;

describe('defaultSearchStrategy', () => {
  describe('search', () => {
    let searchArgs: MockedKeys<SearchStrategySearchParams>;

    beforeEach(() => {
      searchArgs = {
        searchRequests: [
          {
            index: { title: 'foo' },
            body: {},
          },
        ],
        getConfig: jest.fn(),
        onResponse: (req, res) => res,
        legacy: {
          callMsearch: jest.fn().mockResolvedValue(undefined),
          loadingCount$: new BehaviorSubject(0) as any,
        } as jest.Mocked<LegacyFetchHandlers>,
      };
    });

    test('calls callMsearch with the correct arguments', async () => {
      await search({ ...searchArgs });
      expect(searchArgs.legacy.callMsearch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "body": Object {
                "searches": Array [
                  Object {
                    "body": Object {},
                    "header": Object {
                      "index": "foo",
                      "preference": undefined,
                    },
                  },
                ],
              },
              "signal": AbortSignal {},
            },
          ],
        ]
      `);
    });
  });
});
