/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { FilterManager } from './filter_manager';

export const createFilterManagerMock = () => {
  const filterManager = ({
    mergeIncomingFilters: jest.fn(),
    handleStateUpdate: jest.fn(),
    getFilters: jest.fn(),
    getAppFilters: jest.fn(),
    getGlobalFilters: jest.fn(),
    getPartitionedFilters: jest.fn(),
    getUpdates$: jest.fn(() => new Observable()),
    getFetches$: jest.fn(() => new Observable()),
    addFilters: jest.fn(),
    setFilters: jest.fn(),
    setGlobalFilters: jest.fn(),
    setAppFilters: jest.fn(),
    removeFilter: jest.fn(),
    removeAll: jest.fn(),
  } as unknown) as jest.Mocked<FilterManager>;

  return filterManager;
};
