/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  CreateIn,
  CreateResult,
  GetIn,
  SearchIn,
  SearchResult,
  UpdateIn,
} from '@kbn/content-management-plugin/common';
import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { storedFilterSchema, querySchema } from '@kbn/es-query-server';
import type { Writable } from '@kbn/utility-types';
import type * as schema from './schema';
import type { CONTENT_ID } from '../../../common/content_management';

export type DashboardFilter = TypeOf<typeof storedFilterSchema>;
export type DashboardQuery = TypeOf<typeof querySchema>;
export type DashboardOptions = TypeOf<typeof schema.optionsSchema>;

export type DashboardPanel = TypeOf<ReturnType<typeof schema.getPanelSchema>>;
export type DashboardSection = TypeOf<ReturnType<typeof schema.getSectionSchema>>;
export type DashboardState = Writable<TypeOf<ReturnType<typeof schema.getDashboardDataSchema>>>;

export type DashboardItem = TypeOf<ReturnType<typeof schema.getDashboardItemSchema>>;
export type PartialDashboardItem = Omit<DashboardItem, 'attributes' | 'references'> & {
  attributes: Partial<DashboardState>;
  references: SavedObjectReference[] | undefined;
};

export type GridData = TypeOf<typeof schema.panelGridDataSchema>;

// TODO rename to DashboardGetRequestBody
export type DashboardGetIn = GetIn<typeof CONTENT_ID>;
// REST API Get response body
// TODO rename to DashboardGetResponseBody
export type DashboardAPIGetOut = TypeOf<typeof schema.getDashboardAPIGetResultSchema>;
// RPC Get response body
// TODO remove and have RPC endpoints return same shape as REST API or remove RPC routes altogether
export type DashboardGetOut = TypeOf<ReturnType<typeof schema.getDashboardGetResultSchema>>;

export type DashboardCreateIn = CreateIn<typeof CONTENT_ID, DashboardState>;
export type DashboardCreateOut = CreateResult<
  TypeOf<ReturnType<typeof schema.getDashboardItemSchema>>,
  TypeOf<typeof schema.dashboardMetaSchema>
>;
export type DashboardCreateOptions = TypeOf<typeof schema.dashboardCreateOptionsSchema>;

export type DashboardUpdateIn = UpdateIn<typeof CONTENT_ID, Partial<DashboardState>>;
export type DashboardUpdateOut = CreateResult<
  TypeOf<ReturnType<typeof schema.getDashboardItemSchema>>,
  TypeOf<typeof schema.dashboardMetaSchema>
>;
export type DashboardUpdateOptions = TypeOf<typeof schema.dashboardUpdateOptionsSchema>;

export type DashboardSearchIn = SearchIn<typeof CONTENT_ID>;
export type DashboardSearchOptions = TypeOf<typeof schema.dashboardSearchOptionsSchema>;

export type DashboardSearchAPIResult = SearchResult<
  TypeOf<ReturnType<typeof schema.getDashboardItemSchema>>
>;
export type DashboardSearchOut = DashboardSearchAPIResult;
