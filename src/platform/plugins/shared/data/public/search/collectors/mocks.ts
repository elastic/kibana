/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchUsageCollector } from './types';

export function createSearchUsageCollectorMock(): jest.Mocked<SearchUsageCollector> {
  return {
    trackQueryTimedOut: jest.fn(),
    trackSessionIndicatorTourLoading: jest.fn(),
    trackSessionIndicatorTourRestored: jest.fn(),
    trackSessionIndicatorSaveDisabled: jest.fn(),
    trackSessionSentToBackground: jest.fn(),
    trackSessionSavedResults: jest.fn(),
    trackSessionViewRestored: jest.fn(),
    trackSessionIsRestored: jest.fn(),
    trackSessionReloaded: jest.fn(),
    trackSessionExtended: jest.fn(),
    trackSessionCancelled: jest.fn(),
    trackSessionDeleted: jest.fn(),
    trackViewSessionsList: jest.fn(),
    trackSessionsListLoaded: jest.fn(),
  };
}
