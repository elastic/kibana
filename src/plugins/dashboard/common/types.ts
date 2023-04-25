/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput, EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { PersistableControlGroupInput } from '@kbn/controls-plugin/common';

import { SavedDashboardPanel } from './dashboard_saved_object/types';
import { DashboardContainerInput, DashboardPanelState } from './dashboard_container/types';

export interface DashboardOptions {
  hidePanelTitles: boolean;
  useMargins: boolean;
  syncColors: boolean;
  syncTooltips: boolean;
  syncCursor: boolean;
}

export interface DashboardCapabilities {
  showWriteControls: boolean;
  saveQuery: boolean;
  createNew: boolean;
  show: boolean;
  [key: string]: boolean;
}

/**
 * For BWC reasons, dashboard state is stored with panels as an array instead of a map
 */
export type SharedDashboardState = Partial<
  Omit<DashboardContainerInput, 'panels'> & { panels: SavedDashboardPanel[] }
>;

/**
 * Grid type for React Grid Layout
 */
export interface GridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

/**
 * Types below this line are copied here because so many important types are tied up in public. These types should be
 * moved from public into common.
 *
 * TODO replace this type with a type that uses the real Dashboard Input type.
 * See https://github.com/elastic/kibana/issues/147488 for more information.
 */
export interface DashboardContainerStateWithType extends EmbeddableStateWithType {
  panels: {
    [panelId: string]: DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>;
  };
  controlGroupInput?: PersistableControlGroupInput;
}
