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
import { AppState as TAppState } from 'ui/state_management/app_state';
import { ViewMode } from 'src/plugins/embeddable/public';
import {
  RawSavedDashboardPanelTo60,
  RawSavedDashboardPanel610,
  RawSavedDashboardPanel620,
  RawSavedDashboardPanel630,
  RawSavedDashboardPanel640To720,
  RawSavedDashboardPanel730ToLatest,
} from './migrations/types';
import { Query, esFilters } from '../../../../../plugins/data/public';

export type NavAction = (anchorElement?: any) => void;

export interface GridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

/**
 * This should always represent the latest dashboard panel shape, after all possible migrations.
 */
export type SavedDashboardPanel = SavedDashboardPanel730ToLatest;

// id becomes optional starting in 7.3.0
export type SavedDashboardPanel730ToLatest = Pick<
  RawSavedDashboardPanel730ToLatest,
  Exclude<keyof RawSavedDashboardPanel730ToLatest, 'name'>
> & {
  readonly id?: string;
  readonly type: string;
};

export type SavedDashboardPanel640To720 = Pick<
  RawSavedDashboardPanel640To720,
  Exclude<keyof RawSavedDashboardPanel640To720, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel630 = Pick<
  RawSavedDashboardPanel630,
  Exclude<keyof RawSavedDashboardPanel620, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel620 = Pick<
  RawSavedDashboardPanel620,
  Exclude<keyof RawSavedDashboardPanel620, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel610 = Pick<
  RawSavedDashboardPanel610,
  Exclude<keyof RawSavedDashboardPanel610, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanelTo60 = Pick<
  RawSavedDashboardPanelTo60,
  Exclude<keyof RawSavedDashboardPanelTo60, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type DashboardAppStateDefaults = DashboardAppStateParameters & {
  description?: string;
};

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
  filters: esFilters.Filter[];
  viewMode: ViewMode;
  savedQuery?: string;
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

export type ConfirmModalFn = (
  message: string,
  confirmOptions: {
    onConfirm: () => void;
    onCancel: () => void;
    confirmButtonText: string;
    cancelButtonText: string;
    defaultFocusedButton: string;
    title: string;
  }
) => void;

export type AddFilterFn = (
  {
    field,
    value,
    operator,
    index,
  }: {
    field: string;
    value: string;
    operator: string;
    index: string;
  },
  appState: TAppState
) => void;
