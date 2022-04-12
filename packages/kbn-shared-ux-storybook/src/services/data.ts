/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceFactory, SharedUxDataService } from '@kbn/shared-ux-services';

/**
 * A factory function for creating a Storybook implementation of `SharedUxDataService`.
 */
export type SharedUxDataServiceFactory = ServiceFactory<SharedUxDataService>;

/**
 * A factory function for creating a Storybook implementation of `SharedUxDataService`.
 */
export const dataServiceFactory: SharedUxDataServiceFactory = () => ({
  hasESData: () => Promise.resolve(true),
  hasDataView: () => Promise.resolve(false),
  hasUserDataView: () => Promise.resolve(false),
});
