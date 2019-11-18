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

import { createApi } from './create_api';

import { TSearchStrategiesMap } from './i_search_strategy';
import { IRouteHandlerSearchContext } from './i_route_handler_search_context';
import { DEFAULT_SEARCH_STRATEGY } from '../../common/search';

// let mockCoreSetup: MockedKeys<CoreSetup>;

const mockDefaultSearch = jest.fn(() => Promise.resolve({ percentComplete: 0 }));
const mockDefaultSearchStrategyProvider = jest.fn(() =>
  Promise.resolve({
    search: mockDefaultSearch,
  })
);
const mockStrategies: TSearchStrategiesMap = {
  [DEFAULT_SEARCH_STRATEGY]: mockDefaultSearchStrategyProvider,
};

describe('createApi', () => {
  let api: IRouteHandlerSearchContext;

  beforeEach(() => {
    api = createApi({
      caller: jest.fn(),
      searchStrategies: mockStrategies,
    });
    mockDefaultSearchStrategyProvider.mockClear();
  });

  it('should default to DEFAULT_SEARCH_STRATEGY if none is provided', async () => {
    await api.search({
      params: {},
    });
    expect(mockDefaultSearchStrategyProvider).toBeCalled();
    expect(mockDefaultSearch).toBeCalled();
  });

  it('should throw if no provider is found for the given name', () => {
    expect(api.search({}, {}, 'noneByThisName')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No strategy found for noneByThisName"`
    );
  });
});
