/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchUsageCollector } from './types';

export function createSearchUsageCollectorMock(): jest.Mocked<SearchUsageCollector> {
  return {
    trackQueryTimedOut: jest.fn(),
    trackQueriesCancelled: jest.fn(),
    trackSessionSentToBackground: jest.fn(),
    trackSessionSavedResults: jest.fn(),
    trackSessionRestored: jest.fn(),
    trackSessionReloaded: jest.fn(),
    trackSessionExtended: jest.fn(),
    trackSessionCancelled: jest.fn(),
  };
}
