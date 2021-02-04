/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IScopedSearchSessionsClient } from './types';

export function createSearchSessionsClientMock<T = unknown>(): jest.Mocked<
  IScopedSearchSessionsClient<T>
> {
  return {
    getId: jest.fn(),
    trackId: jest.fn(),
    getSearchIdMapping: jest.fn(),
    save: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    extend: jest.fn(),
  };
}
