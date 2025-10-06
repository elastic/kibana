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
import type { WithRequiredProperty } from '@kbn/utility-types';
import type { filterSchema, querySchema } from '@kbn/es-query-server';
import type * as schema from './schema';
import type { CONTENT_ID } from '../../../common/content_management';

export type DashboardFilter = TypeOf<typeof filterSchema>;
export type DashboardQuery = TypeOf<typeof querySchema>;
export type DashboardOptions = TypeOf<typeof schema.optionsSchema>;

// Panel config has some defined types but also allows for custom keys added by embeddables
// The schema uses "unknowns: 'allow'" to permit any other keys, but the TypeOf helper does not
// recognize this, so we need to manually extend the type here.
export type DashboardPanel = Omit<TypeOf<typeof schema.panelSchema>, 'config'> & {
  config: TypeOf<typeof schema.panelSchema>['config'] & { [key: string]: any };
  grid: GridData;
};
export type DashboardSection = TypeOf<typeof schema.sectionSchema>;
// TODO rename to DashboardState once DashboardState in src/platform/plugins/shared/dashboard/common/types.ts is merged with this type
export type DashboardAttributes = Omit<
  TypeOf<typeof schema.dashboardCreateRequestAttributesSchema>,
  'panels'
> & {
  panels: Array<DashboardPanel | DashboardSection>;
};

export type FindDashboardsByIdResponseAttributes = Omit<
  TypeOf<typeof schema.dashboardDataAttributesSchema>,
  'panels'
> & {
  panels: Array<DashboardPanel | DashboardSection>;
};

export type DashboardItem = TypeOf<typeof schema.dashboardItemSchema>;
export type PartialDashboardItem = Omit<DashboardItem, 'attributes' | 'references'> & {
  attributes: Partial<DashboardAttributes>;
  references: SavedObjectReference[] | undefined;
};

export type GridData = WithRequiredProperty<TypeOf<typeof schema.panelGridDataSchema>, 'i'>;

export type DashboardGetIn = GetIn<typeof CONTENT_ID>;
export type DashboardAPIGetOut = GetResult<
  TypeOf<typeof schema.dashboardDataAttributesSchema>,
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
