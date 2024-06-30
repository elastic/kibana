/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import type {
  Capabilities,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  ToastsStart,
  I18nStart,
  IUiSettingsClient,
  PluginInitializerContext,
  HttpStart,
  NotificationsStart,
  ApplicationStart,
  AnalyticsServiceStart,
  AppMountParameters,
  ScopedHistory,
} from '@kbn/core/public';
import type {
  FilterManager,
  TimefilterContract,
  DataViewsContract,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UiCounterMetricType } from '@kbn/analytics';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { memoize, noop } from 'lodash';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import type { AiopsPluginStart } from '@kbn/aiops-plugin/public';
import type { DataVisualizerPluginStart } from '@kbn/data-visualizer-plugin/public';
import type { DiscoverStartPlugins } from './types';
import type { DiscoverContextAppLocator } from './application/context/services/locator';
import type { DiscoverSingleDocLocator } from './application/doc/locator';
import type { DiscoverAppLocator } from '../common';
import type { ProfilesManager } from './context_awareness';

/**
 * Location state of internal Discover history instance
 */
export interface HistoryLocationState {
  referrer: string;
}

export interface UrlTracker {
  setTrackedUrl: (url: string) => void;
  restorePreviousUrl: () => void;
  setTrackingEnabled: (value: boolean) => void;
}

export interface DiscoverServices {
  aiops?: AiopsPluginStart;
  application: ApplicationStart;
  addBasePath: (path: string) => string;
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  capabilities: Capabilities;
  chrome: ChromeStart;
  core: CoreStart;
  data: DataPublicPluginStart;
  docLinks: DocLinksStart;
  embeddable: EmbeddableStart;
  history: History<HistoryLocationState>;
  getScopedHistory: <T>() => ScopedHistory<T | undefined> | undefined;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme: CoreStart['theme'];
  filterManager: FilterManager;
  fieldFormats: FieldFormatsStart;
  dataViews: DataViewsContract;
  inspector: InspectorPublicPluginStart;
  metadata: { branch: string };
  navigation: NavigationPublicPluginStart;
  share?: SharePluginStart;
  urlForwarding: UrlForwardingStart;
  urlTracker: UrlTracker;
  timefilter: TimefilterContract;
  toastNotifications: ToastsStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
  dataVisualizer?: DataVisualizerPluginStart;
  http: HttpStart;
  storage: Storage;
  spaces?: SpacesApi;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  locator: DiscoverAppLocator;
  contextLocator: DiscoverContextAppLocator;
  singleDocLocator: DiscoverSingleDocLocator;
  expressions: ExpressionsStart;
  charts: ChartsPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  savedSearch: SavedSearchPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  lens: LensPublicStart;
  uiActions: UiActionsStart;
  contentClient: ContentClient;
  noDataPage?: NoDataPagePluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  profilesManager: ProfilesManager;
}

export const buildServices = memoize(
  ({
    core,
    plugins,
    context,
    locator,
    contextLocator,
    singleDocLocator,
    history,
    scopedHistory,
    urlTracker,
    profilesManager,
    setHeaderActionMenu = noop,
  }: {
    core: CoreStart;
    plugins: DiscoverStartPlugins;
    context: PluginInitializerContext;
    locator: DiscoverAppLocator;
    contextLocator: DiscoverContextAppLocator;
    singleDocLocator: DiscoverSingleDocLocator;
    history: History<HistoryLocationState>;
    scopedHistory?: ScopedHistory;
    urlTracker: UrlTracker;
    profilesManager: ProfilesManager;
    setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
  }): DiscoverServices => {
    const { usageCollection } = plugins;
    const storage = new Storage(localStorage);

    return {
      aiops: plugins.aiops,
      application: core.application,
      addBasePath: core.http.basePath.prepend,
      analytics: core.analytics,
      capabilities: core.application.capabilities,
      chrome: core.chrome,
      core,
      data: plugins.data,
      dataVisualizer: plugins.dataVisualizer,
      docLinks: core.docLinks,
      embeddable: plugins.embeddable,
      i18n: core.i18n,
      theme: core.theme,
      fieldFormats: plugins.fieldFormats,
      filterManager: plugins.data.query.filterManager,
      history,
      getScopedHistory: <T>() => scopedHistory as ScopedHistory<T | undefined>,
      setHeaderActionMenu,
      dataViews: plugins.data.dataViews,
      inspector: plugins.inspector,
      metadata: {
        branch: context.env.packageInfo.branch,
      },
      navigation: plugins.navigation,
      share: plugins.share,
      urlForwarding: plugins.urlForwarding,
      urlTracker,
      timefilter: plugins.data.query.timefilter.timefilter,
      toastNotifications: core.notifications.toasts,
      notifications: core.notifications,
      uiSettings: core.uiSettings,
      settings: core.settings,
      storage,
      trackUiMetric: usageCollection?.reportUiCounter.bind(usageCollection, 'discover'),
      dataViewFieldEditor: plugins.dataViewFieldEditor,
      http: core.http,
      spaces: plugins.spaces,
      dataViewEditor: plugins.dataViewEditor,
      triggersActionsUi: plugins.triggersActionsUi,
      locator,
      contextLocator,
      singleDocLocator,
      expressions: plugins.expressions,
      charts: plugins.charts,
      savedObjectsTagging: plugins.savedObjectsTaggingOss?.getTaggingApi(),
      savedObjectsManagement: plugins.savedObjectsManagement,
      savedSearch: plugins.savedSearch,
      unifiedSearch: plugins.unifiedSearch,
      lens: plugins.lens,
      uiActions: plugins.uiActions,
      contentClient: plugins.contentManagement.client,
      noDataPage: plugins.noDataPage,
      observabilityAIAssistant: plugins.observabilityAIAssistant,
      profilesManager,
    };
  }
);
