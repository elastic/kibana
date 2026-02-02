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

/** A filter stored in a dashboard. */
export type DashboardFilter = TypeOf<typeof storedFilterSchema>;
/** A query stored in a dashboard. */
export type DashboardQuery = TypeOf<typeof querySchema>;
/** Display options for a dashboard. */
export type DashboardOptions = TypeOf<typeof optionsSchema>;
/** Grid position and size data for a panel. */
export type GridData = TypeOf<typeof panelGridSchema>;
/** A panel in a dashboard containing an embeddable visualization. */
export type DashboardPanel = TypeOf<ReturnType<typeof getPanelSchema>>;
/** A section in a dashboard that groups panels. */
export type DashboardSection = TypeOf<ReturnType<typeof getSectionSchema>>;
/** The complete state of a dashboard including panels, filters, and settings. */
export type DashboardState = Writable<TypeOf<ReturnType<typeof getDashboardStateSchema>>>;
export type DashboardPinnedPanelsState = NonNullable<DashboardState['pinned_panels']>;
export type DashboardPinnedPanel = DashboardPinnedPanelsState[number];
