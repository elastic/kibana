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

import { coreMock } from '../../../../core/public/mocks';
import { SYNC_SEARCH_STRATEGY, syncSearchStrategyProvider } from './sync_search_strategy';
import { CoreSetup } from '../../../../core/public';

describe('Sync search strategy', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  const mockSearch = jest.fn();

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
  });

  it('returns a strategy with `search` that calls the backend API', () => {
    mockCoreSetup.http.fetch.mockImplementationOnce(() => Promise.resolve());

    const syncSearch = syncSearchStrategyProvider(
      {
        core: mockCoreSetup,
      },
      mockSearch
    );
    syncSearch.search(
      {
        serverStrategy: SYNC_SEARCH_STRATEGY,
      },
      {}
    );
    expect(mockCoreSetup.http.fetch.mock.calls[0][0]).toBe(
      `/internal/search/${SYNC_SEARCH_STRATEGY}`
    );
    expect(mockCoreSetup.http.fetch.mock.calls[0][1]).toEqual({
      body: JSON.stringify({
        serverStrategy: 'SYNC_SEARCH_STRATEGY',
      }),
      method: 'POST',
      signal: undefined,
    });
  });
});
