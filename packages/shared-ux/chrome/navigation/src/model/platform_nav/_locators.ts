/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @internal
 */
export const locators = {
  analytics: (params = {}) => ({
    locator: { id: 'ANALYTICS_APP_LOCATOR', params },
  }),
  ml: (params: { page: string; pageState?: string }) => ({
    locator: { id: 'ML_APP_LOCATOR', params },
  }),
  devTools: (params = {}) => ({
    locator: { id: 'DEVTOOLS_APP_LOCATOR', params },
  }),
  // TODO: import ManagementAppLocatorParams for type safety
  management: (params: { sectionId: string; appId?: string }) => ({
    locator: { id: 'MANAGEMENT_APP_LOCATOR', params },
  }),
  // FIXME: Do not use
  unknown: (params: any) => ({
    locator: { id: 'UNKNOWN_APP_LOCATOR', params },
  }),
};
