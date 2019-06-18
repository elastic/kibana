/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Query, EmbeddableFactory } from 'ui/embeddable';
import { AppState } from 'ui/state_management/app_state';
import { UIRegistry } from 'ui/registry/_registry';
import { Filter } from '@kbn/es-query';
import { DashboardViewMode } from './dashboard_view_mode';

export interface EmbeddableFactoryRegistry extends UIRegistry<EmbeddableFactory> {
  byName: { [key: string]: EmbeddableFactory };
}

export type NavAction = (menuItem: any, navController: any, anchorElement: any) => void;

export interface GridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

export interface SavedDashboardPanel {
  // TODO: Make id optional when embeddable API V2 is merged. At that point, it's okay to store panels
  // that aren't backed by saved object ids.
  readonly id: string;

  readonly version: string;
  readonly type: string;
  panelIndex: string;
  embeddableConfig: any;
  readonly gridData: GridData;
  readonly title?: string;
}

export interface Pre61SavedDashboardPanel {
  readonly size_x: number;
  readonly size_y: number;
  readonly row: number;
  readonly col: number;
  readonly panelIndex: number | string; // earlier versions allowed this to be number or string
  readonly id: string;
  readonly type: string;
  embeddableConfig: any;
}

export interface Pre64SavedDashboardPanel {
  columns?: string;
  sort?: string;
  readonly id?: string;
  readonly version: string;
  readonly type: string;
  readonly panelIndex: string;
  readonly gridData: GridData;
  readonly title?: string;
  embeddableConfig: any;
}

export interface DashboardAppStateDefaults {
  panels: SavedDashboardPanel[];
  fullScreenMode: boolean;
  title: string;
  description?: string;
  timeRestore: boolean;
  options: {
    useMargins: boolean;
    hidePanelTitles: boolean;
  };
  query: Query;
  filters: Filter[];
  viewMode: DashboardViewMode;
}

export interface DashboardAppStateParameters {
  panels: SavedDashboardPanel[];
  fullScreenMode: boolean;
  title: string;
  description: string;
  timeRestore: boolean;
  options: {
    hidePanelTitles: boolean;
    useMargins: boolean;
  };
  query: Query | string;
  filters: Filter[];
  viewMode: DashboardViewMode;
}

// This could probably be improved if we flesh out AppState more... though AppState will be going away
// so maybe not worth too much time atm.
export type DashboardAppState = DashboardAppStateParameters & AppState;

export interface SavedDashboardPanelMap {
  [key: string]: SavedDashboardPanel;
}

export interface StagedFilter {
  field: string;
  value: string;
  operator: string;
  index: string;
}
