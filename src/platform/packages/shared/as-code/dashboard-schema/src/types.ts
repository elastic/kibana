/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type { panelGridSchema } from './schemas/panel_grid';
import type { optionsSchema } from './schemas/options';
import type { accessControlSchema } from './schemas/access_control';
import type { sectionGridSchema } from './schemas/section';
import type { basePanelSchema } from './schemas/base_panel';

// Output types (after parsing — all defaults resolved)
export type PanelGrid = z.output<typeof panelGridSchema>;
export type DashboardOptions = z.output<typeof optionsSchema>;
export type AccessControl = z.output<typeof accessControlSchema>;
export type SectionGrid = z.output<typeof sectionGridSchema>;
export type BasePanel = z.output<typeof basePanelSchema>;

// Input types (before parsing — fields with defaults are optional)
export type PanelGridInput = z.input<typeof panelGridSchema>;
export type DashboardOptionsInput = z.input<typeof optionsSchema>;
export type AccessControlInput = z.input<typeof accessControlSchema>;
export type SectionGridInput = z.input<typeof sectionGridSchema>;
export type BasePanelInput = z.input<typeof basePanelSchema>;
