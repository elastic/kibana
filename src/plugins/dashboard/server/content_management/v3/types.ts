/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf } from '@kbn/config-schema';
import {
  CreateIn,
  GetIn,
  SearchIn,
  SearchResult,
  UpdateIn,
} from '@kbn/content-management-plugin/common';
import {
  dashboardItemSchema,
  controlGroupInputSchema,
  gridDataSchema,
  panelSchema,
  dashboardAttributesSchema,
  dashboardCreateOptionsSchema,
  dashboardCreateResultSchema,
  dashboardGetResultSchema,
  dashboardSearchOptionsSchema,
  dashboardSearchResultsSchema,
  dashboardUpdateOptionsSchema,
} from './cm_services';
import { CONTENT_ID } from '../../../common/content_management';

export type DashboardPanel = TypeOf<typeof panelSchema>;

export type DashboardItem = TypeOf<typeof dashboardItemSchema>;

export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;
export type ControlGroupAttributes = TypeOf<typeof controlGroupInputSchema>;
export type GridData = TypeOf<typeof gridDataSchema>;

export type DashboardGetIn = GetIn<typeof CONTENT_ID>;
export type DashboardGetOut = TypeOf<typeof dashboardGetResultSchema>;

export type DashboardCreateIn = CreateIn<typeof CONTENT_ID, DashboardAttributes>;
export type DashboardCreateOut = TypeOf<typeof dashboardCreateResultSchema>;
export type DashboardCreateOptions = TypeOf<typeof dashboardCreateOptionsSchema>;

export type DashboardUpdateIn = UpdateIn<typeof CONTENT_ID, Partial<DashboardAttributes>>;
export type DashboardUpdateOut = TypeOf<typeof dashboardCreateResultSchema>;
export type DashboardUpdateOptions = TypeOf<typeof dashboardUpdateOptionsSchema>;

export type DashboardSearchIn = SearchIn<typeof CONTENT_ID>;
export type DashboardSearchOptions = TypeOf<typeof dashboardSearchOptionsSchema>;
export type DashboardSearchOut = SearchResult<TypeOf<typeof dashboardSearchResultsSchema>>;
