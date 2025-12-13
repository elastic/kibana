/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { SerializedPanelState } from '@kbn/presentation-publishing';
import type { GridData } from '../../server';
import type { PanelPlacementStrategy } from '../plugin_constants';
import type { DashboardLayout } from '../dashboard_api/layout_manager';

export interface PanelPlacementSettings {
  strategy?: PanelPlacementStrategy;
  height?: number;
  width?: number;
}

export interface PanelPlacementReturn {
  newPanelPlacement: GridData;
  otherPanels: DashboardLayout['panels'];
}

export interface PanelPlacementProps {
  width: number;
  height: number;
  currentPanels: DashboardLayout['panels'];
  sectionId?: string; // section where panel is being placed
  beside?: string; // the ID of the panel to place the new panel relative to
}

export interface PanelResizeSettings {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export type PanelSettings = Partial<{
  placementSettings: PanelPlacementSettings;
  resizeSettings: PanelResizeSettings;
}>;

export type GetPanelSettings<SerializedState extends object = object> = (
  serializedState?: SerializedPanelState<SerializedState>
) => MaybePromise<PanelSettings>;
