/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceFactory } from '../../types';
import { SharedUxDataService } from '../data';

/**
 * A factory function for creating a Jest-based implementation of `SharedUxDataService`.
 */
export type MockDataServiceFactory = ServiceFactory<SharedUxDataService>;

export interface MockDataServiceFactoryConfig {
  hasESData: boolean;
  hasDataView: boolean;
  hasUserDataView: boolean;
}

/**
 * A factory function for creating a Jest-based implementation of `SharedUxDataService`.
 */
export const dataServiceFactory: (config?: MockDataServiceFactoryConfig) => SharedUxDataService = (
  config?: MockDataServiceFactoryConfig
) => ({
  hasESData: () => Promise.resolve(config?.hasESData || true),
  hasDataView: () => Promise.resolve(config?.hasDataView || false),
  hasUserDataView: () => Promise.resolve(config?.hasUserDataView || false),
});
