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

import { defaultSearchStrategy } from './default_search_strategy';
import { IUiSettingsClient } from '../../../../../../core/public';
import { SearchStrategySearchParams } from './types';

const { search } = defaultSearchStrategy;

function getConfigStub(config: any = {}) {
  return {
    get: key => config[key],
  } as IUiSettingsClient;
}

const searchMockResponse: any = Promise.resolve([]);
searchMockResponse.abort = jest.fn();
const searchMock = jest.fn().mockReturnValue({
  toPromise: () => searchMockResponse,
});

describe('defaultSearchStrategy', function() {
  describe('search', function() {
    let searchArgs: MockedKeys<Omit<SearchStrategySearchParams, 'config'>>;

    beforeEach(() => {
      searchMockResponse.abort.mockClear();
      searchMock.mockClear();

      searchArgs = {
        searchRequests: [
          {
            index: { title: 'foo' },
          },
        ],
        esShardTimeout: 0,
        searchService: {
          search: searchMock,
        },
      };
    });

    test('should call search service', () => {
      const config = getConfigStub();
      search({ ...searchArgs, config });
      expect(searchMock).toHaveBeenCalled();
    });

    test('should properly abort with search', async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
      const config = getConfigStub({});
      search({ ...searchArgs, config }).abort();
      expect(abortSpy).toHaveBeenCalled();
    });
  });
});
