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

import { HttpStart } from 'src/core/public';
import { coreMock } from '../../../../../core/public/mocks';
import { getCallMsearch } from './call_msearch';
import { defaultSearchStrategy } from './default_search_strategy';
import { LegacyFetchHandlers, SearchStrategySearchParams } from './types';
import { BehaviorSubject } from 'rxjs';

const { search } = defaultSearchStrategy;

const msearchMock = jest.fn().mockResolvedValue({ body: { responses: [] } });

describe('defaultSearchStrategy', function () {
  describe('search', function () {
    let searchArgs: MockedKeys<SearchStrategySearchParams>;
    let http: jest.Mocked<HttpStart>;

    beforeEach(() => {
      msearchMock.mockClear();

      http = coreMock.createStart().http;
      http.post.mockResolvedValue(msearchMock);

      searchArgs = {
        searchRequests: [
          {
            index: { title: 'foo' },
          },
        ],
        getConfig: jest.fn(),
        onResponse: (req, res) => res,
        legacy: {
          callMsearch: getCallMsearch({ http }),
          loadingCount$: new BehaviorSubject(0) as any,
        } as jest.Mocked<LegacyFetchHandlers>,
      };
    });

    test('calls http.post with the correct arguments', async () => {
      await search({ ...searchArgs });
      expect(http.post.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/internal/_msearch",
            Object {
              "body": "{\\"searches\\":[{\\"header\\":{\\"index\\":\\"foo\\"}}]}",
              "signal": AbortSignal {},
            },
          ],
        ]
      `);
    });
  });
});
