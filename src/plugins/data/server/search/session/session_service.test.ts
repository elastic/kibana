/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
