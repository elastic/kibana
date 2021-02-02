/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { History } from 'history';

import {
  Capabilities,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  ToastsStart,
  IUiSettingsClient,
  PluginInitializerContext,
} from 'kibana/public';
import {
  FilterManager,
  TimefilterContract,
  IndexPatternsContract,
  DataPublicPluginStart,
} from 'src/plugins/data/public';
import { Start as InspectorPublicPluginStart } from 'src/plugins/inspector/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';

import { UiCounterMetricType } from '@kbn/analytics';
import { DiscoverStartPlugins } from './plugin';
import { createSavedSearchesLoader, SavedSearch } from './saved_searches';
import { getHistory } from './kibana_services';
import { KibanaLegacyStart } from '../../kibana_legacy/public';
import { UrlForwardingStart } from '../../url_forwarding/public';
import { NavigationPublicPluginStart } from '../../navigation/public';

export interface DiscoverServices {
  addBasePath: (path: string) => string;
  capabilities: Capabilities;
  chrome: ChromeStart;
  core: CoreStart;
  data: DataPublicPluginStart;
  docLinks: DocLinksStart;
  history: () => History;
  theme: ChartsPluginStart['theme'];
  filterManager: FilterManager;
  indexPatterns: IndexPatternsContract;
  inspector: InspectorPublicPluginStart;
  metadata: { branch: string };
  navigation: NavigationPublicPluginStart;
  share?: SharePluginStart;
  kibanaLegacy: KibanaLegacyStart;
  urlForwarding: UrlForwardingStart;
  timefilter: TimefilterContract;
  toastNotifications: ToastsStart;
  getSavedSearchById: (id: string) => Promise<SavedSearch>;
  getSavedSearchUrlById: (id: string) => Promise<string>;
  getEmbeddableInjector: any;
  uiSettings: IUiSettingsClient;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}

export async function buildServices(
  core: CoreStart,
  plugins: DiscoverStartPlugins,
  context: PluginInitializerContext,
  getEmbeddableInjector: any
): Promise<DiscoverServices> {
  const services = {
    savedObjectsClient: core.savedObjects.client,
    savedObjects: plugins.savedObjects,
  };
  const savedObjectService = createSavedSearchesLoader(services);
  const { usageCollection } = plugins;

  return {
    addBasePath: core.http.basePath.prepend,
    capabilities: core.application.capabilities,
    chrome: core.chrome,
    core,
    data: plugins.data,
    docLinks: core.docLinks,
    theme: plugins.charts.theme,
    filterManager: plugins.data.query.filterManager,
    getEmbeddableInjector,
    getSavedSearchById: async (id: string) => savedObjectService.get(id),
    getSavedSearchUrlById: async (id: string) => savedObjectService.urlFor(id),
    history: getHistory,
    indexPatterns: plugins.data.indexPatterns,
    inspector: plugins.inspector,
    metadata: {
      branch: context.env.packageInfo.branch,
    },
    navigation: plugins.navigation,
    share: plugins.share,
    kibanaLegacy: plugins.kibanaLegacy,
    urlForwarding: plugins.urlForwarding,
    timefilter: plugins.data.query.timefilter.timefilter,
    toastNotifications: core.notifications.toasts,
    uiSettings: core.uiSettings,
    trackUiMetric: usageCollection?.reportUiCounter.bind(usageCollection, 'discover'),
  };
}
