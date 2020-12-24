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

import { History } from 'history';
import { TimeRange, Query, Filter, DataPublicPluginStart } from 'src/plugins/data/public';
import {
  PersistedState,
  SavedVisState,
  VisualizationsStart,
  Vis,
  VisualizeEmbeddableContract,
  VisSavedObject,
} from 'src/plugins/visualizations/public';
import {
  CoreStart,
  PluginInitializerContext,
  ChromeStart,
  ToastsStart,
  ScopedHistory,
  AppMountParameters,
} from 'kibana/public';
import { NavigationPublicPluginStart as NavigationStart } from 'src/plugins/navigation/public';
import {
  Storage,
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
} from 'src/plugins/kibana_utils/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { SavedObjectsStart, SavedObject } from 'src/plugins/saved_objects/public';
import { EmbeddableStart, EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import { EventEmitter } from 'events';
import { DashboardStart } from '../../../dashboard/public';
import type { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';

export type PureVisState = SavedVisState;

export interface VisualizeAppState {
  filters: Filter[];
  uiState: Record<string, unknown>;
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
  unlinkSavedSearch: (
    state: VisualizeAppState
  ) => ({ query, parentFilters }: { query?: Query; parentFilters?: Filter[] }) => VisualizeAppState;
  updateVisState: (state: VisualizeAppState) => (vis: PureVisState) => VisualizeAppState;
  updateSavedQuery: (state: VisualizeAppState) => (savedQueryId?: string) => VisualizeAppState;
}

export type VisualizeAppStateContainer = ReduxLikeStateContainer<
  VisualizeAppState,
  VisualizeAppStateTransitions
>;

export interface EditorRenderProps {
  core: CoreStart;
  data: DataPublicPluginStart;
  filters: Filter[];
  timeRange: TimeRange;
  query?: Query;
  savedSearch?: SavedObject;
  uiState: PersistedState;
  /**
   * Flag to determine if visualiztion is linked to the saved search
   */
  linked: boolean;
}

export interface VisualizeServices extends CoreStart {
  stateTransferService: EmbeddableStateTransfer;
  embeddable: EmbeddableStart;
  history: History;
  kbnUrlStateStorage: IKbnUrlStateStorage;
  urlForwarding: UrlForwardingStart;
  pluginInitializerContext: PluginInitializerContext;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  localStorage: Storage;
  navigation: NavigationStart;
  toastNotifications: ToastsStart;
  share?: SharePluginStart;
  visualizeCapabilities: any;
  visualizations: VisualizationsStart;
  savedObjectsPublic: SavedObjectsStart;
  savedVisualizations: VisualizationsStart['savedVisualizationsLoader'];
  setActiveUrl: (newUrl: string) => void;
  createVisEmbeddableFromObject: VisualizationsStart['__LEGACY']['createVisEmbeddableFromObject'];
  restorePreviousUrl: () => void;
  scopedHistory: ScopedHistory;
  dashboard: DashboardStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

export interface SavedVisInstance {
  vis: Vis;
  savedVis: VisSavedObject;
  savedSearch?: SavedObject;
  embeddableHandler: VisualizeEmbeddableContract;
}

export interface ByValueVisInstance {
  vis: Vis;
  savedSearch?: SavedObject;
  embeddableHandler: VisualizeEmbeddableContract;
}

export type VisualizeEditorVisInstance = SavedVisInstance | ByValueVisInstance;

export type VisEditorConstructor = new (
  element: HTMLElement,
  vis: Vis,
  eventEmitter: EventEmitter,
  embeddableHandler: VisualizeEmbeddableContract
) => IEditorController;

export interface IEditorController {
  render(props: EditorRenderProps): Promise<void> | void;
  destroy(): void;
}
