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
  GetResult,
  SearchIn,
  SearchResult,
  UpdateIn,
} from '@kbn/content-management-plugin/common';
import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { filterSchema, querySchema } from '@kbn/es-query-server';
import type * as schema from './schema';
import type { CONTENT_ID } from '../../../common/content_management';

export type DashboardFilter = TypeOf<typeof filterSchema>;
export type DashboardQuery = TypeOf<typeof querySchema>;
export type DashboardOptions = TypeOf<typeof schema.optionsSchema>;

export type DashboardPanel = Omit<TypeOf<typeof schema.panelSchema>, 'config'> & {
  // Dashboard interacts with embeddables via the API returned from ReactEmbeddableRenderer.
  // Dashboard should never directly access embeddable state.
  // Typing as Record to enforce this contract.
  config: Record<string, unknown>;
};
export type DashboardSection = TypeOf<typeof schema.sectionSchema>;
// TODO rename to DashboardState once DashboardState in src/platform/plugins/shared/dashboard/common/types.ts is merged with this type
export type DashboardAttributes = TypeOf<typeof schema.dashboardDataSchema>;

export type DashboardItem = TypeOf<typeof schema.dashboardItemSchema>;
export type PartialDashboardItem = Omit<DashboardItem, 'attributes' | 'references'> & {
  attributes: Partial<DashboardAttributes>;
  references: SavedObjectReference[] | undefined;
};

export type GridData = TypeOf<typeof schema.panelGridDataSchema>;

export type DashboardGetIn = GetIn<typeof CONTENT_ID>;
export type DashboardAPIGetOut = GetResult<
  TypeOf<typeof schema.dashboardDataSchema>,
  TypeOf<typeof schema.dashboardGetResultMetaSchema>
>;
export type DashboardGetOut = TypeOf<typeof schema.dashboardGetResultSchema>;

export type DashboardCreateIn = CreateIn<typeof CONTENT_ID, DashboardAttributes>;
export type DashboardCreateOut = CreateResult<
  TypeOf<typeof schema.dashboardItemSchema>,
  TypeOf<typeof schema.dashboardMetaSchema>
>;
export type DashboardCreateOptions = TypeOf<typeof schema.dashboardCreateOptionsSchema>;

export type DashboardUpdateIn = UpdateIn<typeof CONTENT_ID, Partial<DashboardAttributes>>;
export type DashboardUpdateOut = CreateResult<
  TypeOf<typeof schema.dashboardItemSchema>,
  TypeOf<typeof schema.dashboardMetaSchema>
>;
export type DashboardUpdateOptions = TypeOf<typeof schema.dashboardUpdateOptionsSchema>;

export type DashboardSearchIn = SearchIn<typeof CONTENT_ID>;
export type DashboardSearchOptions = TypeOf<typeof schema.dashboardSearchOptionsSchema>;

export type DashboardSearchAPIResult = SearchResult<TypeOf<typeof schema.dashboardItemSchema>>;
export type DashboardSearchOut = DashboardSearchAPIResult;
