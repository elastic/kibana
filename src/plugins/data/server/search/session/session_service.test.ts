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

import { of } from 'rxjs';
import { SearchStrategyDependencies } from '../types';
import { SessionService } from './session_service';

describe('SessionService', () => {
  it('search invokes `strategy.search`', async () => {
    const service = new SessionService();
    const mockSearch = jest.fn().mockReturnValue(of({}));
    const mockStrategy = { search: mockSearch };
    const mockRequest = { id: 'bar' };
    const mockOptions = { sessionId: '1234' };
    const mockDeps = { savedObjectsClient: {} } as SearchStrategyDependencies;

    await service.search(mockStrategy, mockRequest, mockOptions, mockDeps);

    expect(mockSearch).toHaveBeenCalled();
    expect(mockSearch).toHaveBeenCalledWith(mockRequest, mockOptions, mockDeps);
  });
});
