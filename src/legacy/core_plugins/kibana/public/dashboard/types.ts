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

import { AppState } from 'ui/state_management/app_state';
import { Query, Filter, ViewMode } from 'plugins/embeddable_api';

export interface GridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

export interface SavedDashboardPanel {
  readonly id?: string;
  readonly version: string;
  readonly type: string;
  readonly panelIndex: string;
  readonly embeddableConfig: any;
  readonly gridData: GridData;
  readonly title?: string;
}

export interface Pre61SavedDashboardPanel {
  readonly size_x: number;
  readonly size_y: number;
  readonly row: number;
  readonly col: number;
  readonly panelIndex: any; // earlier versions allowed this to be number or string
  readonly id: string;
  readonly type: string;
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
  readonly embeddableConfig: any;
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
  viewMode: ViewMode;
}

export interface DashboardAppState extends AppState {
  panels: SavedDashboardPanel[];
  fullScreenMode: boolean;
  title: string;
  description: string;
  timeRestore: boolean;
  options: {
    hidePanelTitles: boolean;
    useMargins: boolean;
  };
  query: Query;
  filters: Filter[];
  viewMode: ViewMode;
}
