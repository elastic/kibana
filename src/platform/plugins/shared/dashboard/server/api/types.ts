/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { storedFilterSchema, querySchema } from '@kbn/es-query-server';
import type { Writable } from '@kbn/utility-types';
import type {
  getDashboardStateSchema,
  getPanelSchema,
  getSectionSchema,
  optionsSchema,
  panelGridSchema,
} from './dashboard_state_schemas';

export type DashboardFilter = TypeOf<typeof storedFilterSchema>;
export type DashboardQuery = TypeOf<typeof querySchema>;
export type DashboardOptions = TypeOf<typeof optionsSchema>;
export type GridData = TypeOf<typeof panelGridSchema>;
export type DashboardPanel = TypeOf<ReturnType<typeof getPanelSchema>>;
export type DashboardSection = TypeOf<ReturnType<typeof getSectionSchema>>;
export type DashboardState = Writable<TypeOf<ReturnType<typeof getDashboardStateSchema>>>;
export type DashboardControlsState = NonNullable<DashboardState['controlGroupInput']>['controls'];
