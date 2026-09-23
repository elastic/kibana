/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type {
  discoverSessionApiDataSchema,
  discoverSessionApiClassicTabSchema,
  discoverSessionApiDefaultTabTypeStateSchema,
  discoverSessionApiEsqlTabSchema,
  discoverSessionApiMetricsTabSchema,
  discoverSessionApiTabSchema,
} from './schemas/session_data';
import type { discoverSessionApiMetricsTabTypeStateSchema } from './schemas/metrics_tab';
import type {
  discoverSessionApiClassicTabBaseSchema,
  discoverSessionApiEsqlTabBaseSchema,
  discoverSessionApiTabBaseSchema,
} from './schemas/tab';
import type { discoverSessionApiPanelOverridesSchema } from './schemas/panel_overrides';

// Output types (after parsing — all defaults resolved)
// Base tabs hold the settings shared by panels and sessions.
// Full session tabs add an ID, a label and presentation settings.
export type DiscoverSessionApiClassicTabBase = z.output<
  typeof discoverSessionApiClassicTabBaseSchema
>;
export type DiscoverSessionApiEsqlTabBase = z.output<typeof discoverSessionApiEsqlTabBaseSchema>;
export type DiscoverSessionApiTabBase = z.output<typeof discoverSessionApiTabBaseSchema>;

export type DiscoverSessionApiPanelOverrides = z.output<
  typeof discoverSessionApiPanelOverridesSchema
>;
export type DiscoverSessionApiData = z.output<typeof discoverSessionApiDataSchema>;
export type DiscoverSessionApiClassicTab = z.output<typeof discoverSessionApiClassicTabSchema>;
export type DiscoverSessionApiMetricsTab = z.output<typeof discoverSessionApiMetricsTabSchema>;
export type DiscoverSessionApiEsqlTab =
  | z.output<typeof discoverSessionApiEsqlTabSchema>
  | DiscoverSessionApiMetricsTab;
export type DiscoverSessionApiTab = z.output<typeof discoverSessionApiTabSchema>;
export type DiscoverSessionApiMetricsTabTypeState = z.output<
  typeof discoverSessionApiMetricsTabTypeStateSchema
>;
export type DiscoverSessionApiTabTypeState =
  | z.output<typeof discoverSessionApiDefaultTabTypeStateSchema>
  | DiscoverSessionApiMetricsTabTypeState;

// Input types (before parsing — fields with defaults are optional)
export type DiscoverSessionApiDataInput = z.input<typeof discoverSessionApiDataSchema>;
