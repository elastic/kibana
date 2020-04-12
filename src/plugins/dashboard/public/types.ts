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

import { Query, Filter } from 'src/plugins/data/public';
import { SavedObject as SavedObjectType, SavedObjectAttributes } from 'src/core/public';
import {
  RawSavedDashboardPanelTo60,
  RawSavedDashboardPanel610,
  RawSavedDashboardPanel620,
  RawSavedDashboardPanel630,
  RawSavedDashboardPanel640To720,
  RawSavedDashboardPanel730ToLatest,
} from './bwc';
import { ViewMode } from './embeddable_plugin';

export interface DashboardCapabilities {
  showWriteControls: boolean;
  createNew: boolean;
}

// TODO: Replace Saved object interfaces by the ones Core will provide when it is ready.
export type SavedObjectAttribute =
  | string
  | number
  | boolean
  | null
  | undefined
  | SavedObjectAttributes
  | SavedObjectAttributes[];

export interface SimpleSavedObject<T extends SavedObjectAttributes> {
  attributes: T;
  _version?: SavedObjectType<T>['version'];
  id: SavedObjectType<T>['id'];
  type: SavedObjectType<T>['type'];
  migrationVersion: SavedObjectType<T>['migrationVersion'];
  error: SavedObjectType<T>['error'];
  references: SavedObjectType<T>['references'];
  get(key: string): any;
  set(key: string, value: any): T;
  has(key: string): boolean;
  save(): Promise<SimpleSavedObject<T>>;
  delete(): void;
}

interface FieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
}

export interface Field {
  name: string;
  type: string;
  // esTypes might be undefined on old index patterns that have not been refreshed since we added
  // this prop. It is also undefined on scripted fields.
  esTypes?: string[];
  aggregatable: boolean;
  filterable: boolean;
  searchable: boolean;
  subType?: FieldSubType;
}

export type NavAction = (anchorElement?: any) => void;

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

export interface DashboardAppState {
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
  viewMode: ViewMode;
  savedQuery?: string;
}

export type DashboardAppStateDefaults = DashboardAppState & {
  description?: string;
};

/**
 * In URL panels are optional,
 * Panels are not added to the URL when in "view" mode
 */
export type DashboardAppStateInUrl = Omit<DashboardAppState, 'panels'> & {
  panels?: SavedDashboardPanel[];
};

export interface DashboardAppStateTransitions {
  set: (
    state: DashboardAppState
  ) => <T extends keyof DashboardAppState>(
    prop: T,
    value: DashboardAppState[T]
  ) => DashboardAppState;
  setOption: (
    state: DashboardAppState
  ) => <T extends keyof DashboardAppState['options']>(
    prop: T,
    value: DashboardAppState['options'][T]
  ) => DashboardAppState;
}

export interface SavedDashboardPanelMap {
  [key: string]: SavedDashboardPanel;
}

export interface StagedFilter {
  field: string;
  value: string;
  operator: string;
  index: string;
}
