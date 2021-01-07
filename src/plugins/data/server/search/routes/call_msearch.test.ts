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
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { Observable } from 'rxjs';
import { IUiSettingsClient, IScopedClusterClient, SharedGlobalConfig } from 'src/core/server';

import {
  coreMock,
  pluginInitializerContextConfigMock,
} from '../../../../../../src/core/server/mocks';
import { convertRequestBody, getCallMsearch } from './call_msearch';

describe('callMsearch', () => {
  let esClient: DeeplyMockedKeys<IScopedClusterClient>;
  let globalConfig$: Observable<SharedGlobalConfig>;
  let uiSettings: IUiSettingsClient;
  let callMsearch: ReturnType<typeof getCallMsearch>;

  beforeEach(() => {
    const coreContext = coreMock.createRequestHandlerContext();
    esClient = coreContext.elasticsearch.client;
    globalConfig$ = pluginInitializerContextConfigMock({}).legacy.globalConfig$;
    uiSettings = coreContext.uiSettings.client;

    callMsearch = getCallMsearch({ esClient, globalConfig$, uiSettings });
  });

  it('handler calls msearch with the given request', async () => {
    const mockBody = {
      searches: [{ header: { index: 'foo' }, body: { query: { match_all: {} } } }],
    };

    await callMsearch({
      body: mockBody,
      signal: new AbortController().signal,
    });

    expect(esClient.asCurrentUser.msearch).toHaveBeenCalledTimes(1);
    expect(esClient.asCurrentUser.msearch.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": "{\\"ignore_unavailable\\":true,\\"index\\":\\"foo\\"}
      {\\"query\\":{\\"match_all\\":{}}}
      ",
        },
        Object {
          "querystring": Object {
            "ignore_unavailable": true,
            "max_concurrent_shard_requests": undefined,
          },
        },
      ]
    `);
  });

  describe('convertRequestBody', () => {
    it('combines header & body into proper msearch request', () => {
      const request = {
        searches: [{ header: { index: 'foo', preference: 0 }, body: { test: true } }],
      };
      expect(convertRequestBody(request, { timeout: '30000ms' })).toMatchInlineSnapshot(`
        "{\\"ignore_unavailable\\":true,\\"index\\":\\"foo\\",\\"preference\\":0}
        {\\"timeout\\":\\"30000ms\\",\\"test\\":true}
        "
      `);
    });

    it('handles multiple searches', () => {
      const request = {
        searches: [
          { header: { index: 'foo', preference: 0 }, body: { test: true } },
          { header: { index: 'bar', preference: 1 }, body: { hello: 'world' } },
        ],
      };
      expect(convertRequestBody(request, { timeout: '30000ms' })).toMatchInlineSnapshot(`
        "{\\"ignore_unavailable\\":true,\\"index\\":\\"foo\\",\\"preference\\":0}
        {\\"timeout\\":\\"30000ms\\",\\"test\\":true}
        {\\"ignore_unavailable\\":true,\\"index\\":\\"bar\\",\\"preference\\":1}
        {\\"timeout\\":\\"30000ms\\",\\"hello\\":\\"world\\"}
        "
      `);
    });
  });
});
