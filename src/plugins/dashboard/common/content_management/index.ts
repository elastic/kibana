/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { LATEST_VERSION, CONTENT_ID } from './constants';

export type { DashboardContentType } from './types';

export type {
  GridData,
  DashboardItem,
  DashboardCrudTypes,
  DashboardAttributes,
  SavedDashboardPanel,
} from './latest';

// Today "v1" === "latest" so the export under DashboardV1 namespace is not really useful
// We leave it as a reference for future version when it will be needed to export/support older types
// in the UIs.
export * as DashboardV1 from './v1';
