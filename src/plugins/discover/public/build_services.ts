/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import { memoize } from 'lodash';

import {
  Capabilities,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  ToastsStart,
  IUiSettingsClient,
  PluginInitializerContext,
  HttpStart,
  NotificationsStart,
  ApplicationStart,
} from '@kbn/core/public';
import {
  FilterManager,
  TimefilterContract,
  DataViewsContract,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';
import { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { UiCounterMetricType } from '@kbn/analytics';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';

import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { DiscoverAppLocator } from './locator';
import { getHistory } from './kibana_services';
import { DiscoverStartPlugins } from './plugin';

export interface HistoryLocationState {
  referrer: string;
}

export interface DiscoverServices {
  application: ApplicationStart;
  addBasePath: (path: string) => string;
  capabilities: Capabilities;
  chrome: ChromeStart;
  core: CoreStart;
  data: DataPublicPluginStart;
  docLinks: DocLinksStart;
  embeddable: EmbeddableStart;
  history: () => History<HistoryLocationState>;
  theme: ChartsPluginStart['theme'];
  filterManager: FilterManager;
  fieldFormats: FieldFormatsStart;
  indexPatterns: DataViewsContract;
  inspector: InspectorPublicPluginStart;
  metadata: { branch: string };
  navigation: NavigationPublicPluginStart;
  share?: SharePluginStart;
  urlForwarding: UrlForwardingStart;
  timefilter: TimefilterContract;
  toastNotifications: ToastsStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
  http: HttpStart;
  storage: Storage;
  spaces?: SpacesApi;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  locator: DiscoverAppLocator;
}

export const buildServices = memoize(function (
  core: CoreStart,
  plugins: DiscoverStartPlugins,
  context: PluginInitializerContext,
  locator: DiscoverAppLocator
): DiscoverServices {
  const { usageCollection } = plugins;
  const storage = new Storage(localStorage);

  return {
    application: core.application,
    addBasePath: core.http.basePath.prepend,
    capabilities: core.application.capabilities,
    chrome: core.chrome,
    core,
    data: plugins.data,
    docLinks: core.docLinks,
    embeddable: plugins.embeddable,
    theme: plugins.charts.theme,
    fieldFormats: plugins.fieldFormats,
    filterManager: plugins.data.query.filterManager,
    history: getHistory,
    indexPatterns: plugins.data.dataViews,
    inspector: plugins.inspector,
    metadata: {
      branch: context.env.packageInfo.branch,
    },
    navigation: plugins.navigation,
    share: plugins.share,
    urlForwarding: plugins.urlForwarding,
    timefilter: plugins.data.query.timefilter.timefilter,
    toastNotifications: core.notifications.toasts,
    notifications: core.notifications,
    uiSettings: core.uiSettings,
    storage,
    trackUiMetric: usageCollection?.reportUiCounter.bind(usageCollection, 'discover'),
    dataViewFieldEditor: plugins.dataViewFieldEditor,
    http: core.http,
    spaces: plugins.spaces,
    dataViewEditor: plugins.dataViewEditor,
    triggersActionsUi: plugins.triggersActionsUi,
    locator,
  };
});
