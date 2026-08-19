/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type { dataTableSchema, dataTableLimitsSchema } from './schemas/data_table';
import type { viewModeSchema } from './schemas/view_mode';
import type { panelOverridesSchema } from './schemas/panel_overrides';
import type { classicTabSchema, esqlTabSchema, tabSchema } from './schemas/tab';
import type { visContextSchema } from './schemas/vis_context';
import type {
  discoverSessionControlPanelSchema,
  discoverSessionControlPanelsSchema,
} from './schemas/control_panel';
import type {
  discoverSessionClassicTabSchema,
  discoverSessionEsqlTabSchema,
  discoverSessionApiTabSchema,
  discoverSessionApiDataSchema,
} from './schemas/session_data';

// Output types (after parsing — all defaults resolved)
export type DataTable = z.output<typeof dataTableSchema>;
export type DataTableLimits = z.output<typeof dataTableLimitsSchema>;
export type ViewMode = z.output<typeof viewModeSchema>;
export type PanelOverrides = z.output<typeof panelOverridesSchema>;
export type ClassicTab = z.output<typeof classicTabSchema>;
export type EsqlTab = z.output<typeof esqlTabSchema>;
export type Tab = z.output<typeof tabSchema>;
export type ControlPanel = z.output<typeof discoverSessionControlPanelSchema>;
export type ControlPanels = z.output<typeof discoverSessionControlPanelsSchema>;
export type VisContext = z.output<typeof visContextSchema>;
export type DiscoverSessionData = z.output<typeof discoverSessionApiDataSchema>;
export type DiscoverSessionApiClassicTab = z.output<typeof discoverSessionClassicTabSchema>;
export type DiscoverSessionApiEsqlTab = z.output<typeof discoverSessionEsqlTabSchema>;
export type DiscoverSessionApiTab = z.output<typeof discoverSessionApiTabSchema>;

// Input types (before parsing — fields with defaults are optional)
export type DataTableInput = z.input<typeof dataTableSchema>;
export type DataTableLimitsInput = z.input<typeof dataTableLimitsSchema>;
export type ViewModeInput = z.input<typeof viewModeSchema>;
export type PanelOverridesInput = z.input<typeof panelOverridesSchema>;
export type ClassicTabInput = z.input<typeof classicTabSchema>;
export type EsqlTabInput = z.input<typeof esqlTabSchema>;
export type TabInput = z.input<typeof tabSchema>;
export type ControlPanelInput = z.input<typeof discoverSessionControlPanelSchema>;
export type ControlPanelsInput = z.input<typeof discoverSessionControlPanelsSchema>;
export type VisContextInput = z.input<typeof visContextSchema>;
export type DiscoverSessionDataInput = z.input<typeof discoverSessionApiDataSchema>;
export type DiscoverSessionApiClassicTabInput = z.input<typeof discoverSessionClassicTabSchema>;
export type DiscoverSessionApiEsqlTabInput = z.input<typeof discoverSessionEsqlTabSchema>;
export type DiscoverSessionApiTabInput = z.input<typeof discoverSessionApiTabSchema>;
