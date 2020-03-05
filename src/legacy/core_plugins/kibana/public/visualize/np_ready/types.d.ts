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

import { TimeRange, Query, Filter, DataPublicPluginStart } from 'src/plugins/data/public';
import { IEmbeddableStart } from 'src/plugins/embeddable/public';
import { PersistedState } from 'src/plugins/visualizations/public';
import { LegacyCoreStart } from 'kibana/public';
import { Vis } from 'src/legacy/core_plugins/visualizations/public';
import { VisSavedObject } from '../legacy_imports';

export type PureVisState = ReturnType<Vis['getCurrentState']>;

export interface VisualizeAppState {
  filters: Filter[];
  uiState: PersistedState;
  vis: PureVisState;
  query: Query;
  savedQuery?: string;
  linked: boolean;
}

export interface VisualizeAppStateTransitions {
  set: (
    state: VisualizeAppState
  ) => <T extends keyof VisualizeAppState>(
    prop: T,
    value: VisualizeAppState[T]
  ) => VisualizeAppState;
  setVis: (state: VisualizeAppState) => (vis: Partial<PureVisState>) => VisualizeAppState;
  removeSavedQuery: (state: VisualizeAppState) => (defaultQuery: Query) => VisualizeAppState;
  unlinkSavedSearch: (
    state: VisualizeAppState
  ) => (query: Query, filters: Filter[]) => VisualizeAppState;
  updateVisState: (state: VisualizeAppState) => (vis: PureVisState) => VisualizeAppState;
}

export interface EditorRenderProps {
  appState: { save(): void };
  core: LegacyCoreStart;
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  filters: Filter[];
  uiState: PersistedState;
  timeRange: TimeRange;
  query?: Query;
  /**
   * Flag to determine if visualiztion is linked to the saved search
   */
  linked: boolean;
}

export interface SavedVisualizations {
  urlFor: (id: string) => string;
  get: (id: string) => Promise<VisSavedObject>;
}
