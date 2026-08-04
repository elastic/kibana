/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type { getControlsGroupSchema as getPinnedPanelsSchema } from '@kbn/controls-schemas';
import type {
  getDashboardStateSchema,
  getPanelSchema,
  getSectionSchema,
  optionsSchema,
  panelGridSchema,
} from './dashboard_state_schemas';
import type { warningsSchema } from './warnings_schema';

export type Warnings = z.output<typeof warningsSchema>;

/** Display options for a dashboard. */
export type DashboardOptions = z.output<typeof optionsSchema>;
/** Grid position and size data for a panel. */
export type GridData = z.output<typeof panelGridSchema>;
/** A panel in a dashboard containing an embeddable visualization. */
export type DashboardPanel = z.output<ReturnType<typeof getPanelSchema>>;
/** A section in a dashboard that groups panels. */
export type DashboardSection = z.output<ReturnType<typeof getSectionSchema>>;
/** The complete state of a dashboard including panels, filters, and settings. */
export type DashboardState = z.output<ReturnType<typeof getDashboardStateSchema>>;
export type DashboardPinnedPanelsState = z.output<ReturnType<typeof getPinnedPanelsSchema>>;
export type DashboardPinnedPanel = DashboardPinnedPanelsState[number];
export type Operation = 'create' | 'read' | 'update' | 'search';
