/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceFactory, SharedUxDataService } from '@kbn/shared-ux-services';

export interface DataServiceFactoryConfig {
  hasESData: boolean;
  hasDataView: boolean;
  hasUserDataView: boolean;
}

/**
 * A factory function for creating a Storybook implementation of `SharedUxDataService`.
 */
export type SharedUxDataServiceFactory = ServiceFactory<
  SharedUxDataService,
  DataServiceFactoryConfig
>;

/**
 * A factory function for creating a Storybook implementation of `SharedUxDataService`.
 */
export const dataServiceFactory: SharedUxDataServiceFactory = (params) => {
  return {
    hasESData: () => Promise.resolve(params.hasESData || false),
    hasDataView: () => Promise.resolve(params.hasDataView || false),
    hasUserDataView: () => Promise.resolve(params.hasUserDataView || false),
  };
};
