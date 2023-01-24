/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EventEmitter } from 'events';
import type { History } from 'history';
import type { SerializableRecord } from '@kbn/utility-types';

import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import type {
  CoreStart,
  PluginInitializerContext,
  ChromeStart,
  ToastsStart,
  ScopedHistory,
  AppMountParameters,
  ThemeServiceStart,
} from '@kbn/core/public';

import type {
  Storage,
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
} from '@kbn/kibana-utils-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';

import type { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { EmbeddableStart, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type {
  Vis,
  VisualizeEmbeddableContract,
  VisSavedObject,
  PersistedState,
  VisParams,
} from '..';

import type { SavedVisState } from '../types';
import type { createVisEmbeddableFromObject } from '../embeddable';
import type { VisEditorsRegistry } from '../vis_editors_registry';

export interface VisualizeAppState {
  dataView?: string;
  filters: Filter[];
  uiState: SerializableRecord;
  vis: SavedVisState;
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
  setVis: (state: VisualizeAppState) => (vis: Partial<SavedVisState>) => VisualizeAppState;
  unlinkSavedSearch: (
    state: VisualizeAppState
  ) => ({ query, parentFilters }: { query?: Query; parentFilters?: Filter[] }) => VisualizeAppState;
  updateVisState: (state: VisualizeAppState) => (vis: SavedVisState) => VisualizeAppState;
  updateSavedQuery: (state: VisualizeAppState) => (savedQueryId?: string) => VisualizeAppState;
  updateDataView: (state: VisualizeAppState) => (dataViewId?: string) => VisualizeAppState;
}

export type VisualizeAppStateContainer = ReduxLikeStateContainer<
  VisualizeAppState,
  VisualizeAppStateTransitions
>;

export interface VisualizeServices extends CoreStart {
  stateTransferService: EmbeddableStateTransfer;
  embeddable: EmbeddableStart;
  history: History;
  dataViewEditor: DataViewEditorStart;
  kbnUrlStateStorage: IKbnUrlStateStorage;
  core: CoreStart;
  urlForwarding: UrlForwardingStart;
  pluginInitializerContext: PluginInitializerContext;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  localStorage: Storage;
  navigation: NavigationStart;
  toastNotifications: ToastsStart;
  share?: SharePluginStart;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  dashboardCapabilities: Record<string, boolean | Record<string, boolean>>;
  setActiveUrl: (newUrl: string) => void;
  createVisEmbeddableFromObject: ReturnType<typeof createVisEmbeddableFromObject>;
  restorePreviousUrl: () => void;
  scopedHistory: ScopedHistory;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  presentationUtil: PresentationUtilPluginStart;
  getKibanaVersion: () => string;
  spaces?: SpacesPluginStart;
  theme: ThemeServiceStart;
  visEditorsRegistry: VisEditorsRegistry;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface VisInstance {
  vis: Vis;
  savedVis: VisSavedObject;
  savedSearch?: SavedSearch;
  embeddableHandler: VisualizeEmbeddableContract;
}

export type SavedVisInstance = VisInstance;
export type ByValueVisInstance = VisInstance;
export type VisualizeEditorVisInstance = SavedVisInstance | ByValueVisInstance;

export type VisEditorConstructor<TVisParams = VisParams> = new (
  element: HTMLElement,
  vis: Vis<TVisParams>,
  eventEmitter: EventEmitter,
  embeddableHandler: VisualizeEmbeddableContract
) => IEditorController;

export interface IEditorController {
  render(props: EditorRenderProps): Promise<void> | void;
  destroy(): void;
}

export interface EditorRenderProps {
  core: CoreStart;
  data: DataPublicPluginStart;
  filters: Filter[];
  timeRange: TimeRange;
  query?: Query;
  savedSearch?: SavedSearch;
  uiState: PersistedState;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  /**
   * Flag to determine if visualiztion is linked to the saved search
   */
  linked: boolean;
}
