/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  serviceDefinition,
  dashboardSavedObjectSchema,
  dashboardAttributesSchema,
} from './cm_services';

export type { GridData, DashboardItem, SavedDashboardPanel } from '../v1/types'; // no changes made to types from v1 to v2
export type { DashboardCrudTypes, DashboardAttributes } from './types';
