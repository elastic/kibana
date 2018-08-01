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

import { EmbeddableMetadata, Filters, Query, TimeRange } from 'ui/embeddable';
import { DashboardViewMode } from '../dashboard_view_mode';

export interface ViewState {
  readonly viewMode: DashboardViewMode;
  readonly isFullScreenMode: boolean;
  readonly maximizedPanelId?: string;
  readonly visibleContextMenuPanelId?: string;
  readonly timeRange: TimeRange;
  readonly hidePanelTitles: boolean;
  readonly useMargins: boolean;
  readonly query: Query;
  readonly filters: Filters;
}

export interface GridData {
  readonly w: number;
  readonly h: number;
  readonly x: number;
  readonly y: number;
  readonly id: string;
}

export type PanelId = string;
export type SavedObjectId = string;

export interface PanelState {
  readonly id: SavedObjectId;
  readonly version: string;
  readonly type: string;
  readonly panelIndex: PanelId;
  readonly embeddableConfig: object;
  readonly gridData: GridData;
  readonly title?: string;
}

export interface EmbeddableReduxState {
  readonly metadata?: EmbeddableMetadata;
  readonly error?: string | object;
  readonly initialized: boolean;
  readonly stagedFilter?: object;
}

export interface PanelsMap {
  readonly [panelId: string]: PanelState;
}

export interface EmbeddablesMap {
  readonly [panelId: string]: EmbeddableReduxState;
}

export interface DashboardMetadata {
  readonly title: string;
  readonly description?: string;
}

export interface DashboardState {
  readonly view: ViewState;
  readonly panels: PanelsMap;
  readonly embeddables: EmbeddablesMap;
  readonly metadata: DashboardMetadata;
}
