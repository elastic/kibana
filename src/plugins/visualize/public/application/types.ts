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

import type {
  CoreStart,
  PluginInitializerContext,
  ChromeStart,
  ToastsStart,
  ScopedHistory,
  AppMountParameters,
} from 'kibana/public';

import type {
  VisualizationsStart,
  Vis,
  VisualizeEmbeddableContract,
  VisSavedObject,
  PersistedState,
  VisParams,
} from 'src/plugins/visualizations/public';

import type {
  Storage,
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
} from 'src/plugins/kibana_utils/public';

import type { NavigationPublicPluginStart as NavigationStart } from 'src/plugins/navigation/public';
import type { Query, Filter, DataPublicPluginStart, TimeRange } from 'src/plugins/data/public';
import type { SharePluginStart } from 'src/plugins/share/public';
import type { SavedObjectsStart } from 'src/plugins/saved_objects/public';
import type { EmbeddableStart, EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import type { UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import type { PresentationUtilPluginStart } from 'src/plugins/presentation_util/public';
import type { SpacesPluginStart } from '../../../../../x-pack/plugins/spaces/public';
import type { DashboardStart } from '../../../dashboard/public';
import type { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';
import type { UsageCollectionStart } from '../../../usage_collection/public';
import type { SavedSearch } from '../../../discover/public';

import { PureVisState } from '../../common/types';

export interface VisualizeAppState {
  filters: Filter[];
  uiState: SerializableRecord;
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
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  dashboardCapabilities: Record<string, boolean | Record<string, boolean>>;
  visualizations: VisualizationsStart;
  savedObjectsPublic: SavedObjectsStart;
  setActiveUrl: (newUrl: string) => void;
  createVisEmbeddableFromObject: VisualizationsStart['__LEGACY']['createVisEmbeddableFromObject'];
  restorePreviousUrl: () => void;
  scopedHistory: ScopedHistory;
  dashboard: DashboardStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  presentationUtil: PresentationUtilPluginStart;
  usageCollection?: UsageCollectionStart;
  getKibanaVersion: () => string;
  spaces?: SpacesPluginStart;
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
  /**
   * Flag to determine if visualiztion is linked to the saved search
   */
  linked: boolean;
}

export type { PureVisState };
