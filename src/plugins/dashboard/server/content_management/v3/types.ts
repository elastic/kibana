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
import { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { WithRequiredProperty } from '@kbn/utility-types';
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
  optionsSchema,
} from './cm_services';
import { CONTENT_ID } from '../../../common/content_management';
import { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';

export type DashboardOptions = TypeOf<typeof optionsSchema>;

// Panel config has some defined types but also allows for custom keys added by embeddables
// The schema uses "unknowns: 'allow'" to permit any other keys, but the TypeOf helper does not
// recognize this, so we need to manually extend the type here.
export type DashboardPanel = Omit<TypeOf<typeof panelSchema>, 'panelConfig'> & {
  panelConfig: TypeOf<typeof panelSchema>['panelConfig'] & { [key: string]: any };
  gridData: GridData;
};
export type DashboardAttributes = Omit<TypeOf<typeof dashboardAttributesSchema>, 'panels'> & {
  panels: DashboardPanel[];
};

export type DashboardItem = TypeOf<typeof dashboardItemSchema>;
export type PartialDashboardItem = Omit<DashboardItem, 'attributes' | 'references'> & {
  attributes: Partial<DashboardAttributes>;
  references: SavedObjectReference[] | undefined;
};

export type ControlGroupAttributes = TypeOf<typeof controlGroupInputSchema>;
export type GridData = WithRequiredProperty<TypeOf<typeof gridDataSchema>, 'i'>;

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

export type SavedObjectToItemReturn<T> =
  | {
      item: T;
      error: null;
    }
  | {
      item: null;
      error: Error;
    };

export type ItemAttrsToSavedObjectAttrsReturn =
  | {
      attributes: DashboardSavedObjectAttributes;
      error: null;
    }
  | {
      attributes: null;
      error: Error;
    };
