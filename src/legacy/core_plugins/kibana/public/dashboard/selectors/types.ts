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

import { EmbeddableMetadata, Query, TimeRange } from 'ui/embeddable';
import { Filter } from '@kbn/es-query';
import { RefreshInterval } from 'ui/timefilter/timefilter';
import { DashboardViewMode } from '../dashboard_view_mode';
import { SavedDashboardPanelMap } from '../types';

export type DashboardViewMode = DashboardViewMode;
export interface ViewState {
  readonly viewMode: DashboardViewMode;
  readonly isFullScreenMode: boolean;
  readonly maximizedPanelId?: string;
  readonly visibleContextMenuPanelId?: string;
  readonly timeRange: TimeRange;
  readonly refreshConfig: RefreshInterval;
  readonly hidePanelTitles: boolean;
  readonly useMargins: boolean;
  readonly query: Query;
  readonly filters: Filter[];
}

export type PanelId = string;
export type SavedObjectId = string;

export interface EmbeddableReduxState {
  readonly metadata?: EmbeddableMetadata;
  readonly error?: string | object;
  readonly initialized: boolean;
  readonly stagedFilter?: object;
  /**
   * Timestamp of the last time this embeddable was requested to reload.
   */
  readonly lastReloadRequestTime: number;
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
  readonly panels: SavedDashboardPanelMap;
  readonly embeddables: EmbeddablesMap;
  readonly metadata: DashboardMetadata;
}
