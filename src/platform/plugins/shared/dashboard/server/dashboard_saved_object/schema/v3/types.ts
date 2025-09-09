/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { controlsGroupSchema } from '@kbn/controls-schemas';
import type { SavedDashboardPanel as SavedDashboardPanelV2 } from '../v2';
import type { dashboardAttributesSchema, gridDataSchema, sectionSchema } from './v3';

export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;
export type GridData = TypeOf<typeof gridDataSchema>;

/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
export type SavedDashboardPanel = Omit<SavedDashboardPanelV2, 'gridData'> & { gridData: GridData };

/**
 * A saved dashboard section parsed directly from the Dashboard Attributes
 */
export type SavedDashboardSection = TypeOf<typeof sectionSchema>;

/**
 * A saved sticky dashboard control parsed directly from the Dashboard Attributes control panels JSON
 */
export type StoredControlState = Pick<
  TypeOf<typeof controlsGroupSchema>['controls'][number],
  'grow' | 'type' | 'width'
> & {
  order: number; // order is generated from the array order
  id: string; // id is required
  dataViewRefName?: string;
  explicitInput: Omit<
    TypeOf<typeof controlsGroupSchema>['controls'][number],
    'grow' | 'type' | 'width'
  >;
};

export type StoredControlGroupInput = Omit<
  TypeOf<typeof dashboardAttributesSchema>['controlGroupInput'],
  'panelsJSON' | 'ignoreParentSettingsJSON'
> & {
  panels: { [key: string]: Omit<StoredControlState, 'id'> };
  ignoreParentSettings: {
    ignoreFilters?: boolean;
    ignoreQuery?: boolean;
    ignoreTimerange?: boolean;
    ignoreValidations?: boolean;
  };
};
