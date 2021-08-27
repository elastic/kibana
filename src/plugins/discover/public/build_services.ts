/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { UiCounterMetricType } from '@kbn/analytics';
import { auto } from 'angular';
import type { History } from 'history';
import type { CoreStart } from '../../../core/public';
import type { ChromeStart } from '../../../core/public/chrome/types';
import type { DocLinksStart } from '../../../core/public/doc_links/doc_links_service';
import type { ToastsStart } from '../../../core/public/notifications/toasts/toasts_service';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import type { IUiSettingsClient } from '../../../core/public/ui_settings/types';
import type { Capabilities } from '../../../core/types/capabilities';
import type { ChartsPluginStart } from '../../charts/public/plugin';
import type { IndexPatternsContract } from '../../data/common/index_patterns/index_patterns/index_patterns';
import { FilterManager } from '../../data/public/query/filter_manager/filter_manager';
import type { TimefilterContract } from '../../data/public/query/timefilter/timefilter';
import type { DataPublicPluginStart } from '../../data/public/types';
import type { PluginStart as IndexPatternFieldEditorStart } from '../../index_pattern_field_editor/public/types';
import type { Start as InspectorPublicPluginStart } from '../../inspector/public/plugin';
import type { KibanaLegacyStart } from '../../kibana_legacy/public/plugin';
import type { NavigationPublicPluginStart } from '../../navigation/public/types';
import type { SharePluginStart } from '../../share/public/plugin';
import type { UrlForwardingStart } from '../../url_forwarding/public/plugin';
import { getHistory } from './kibana_services';
import type { DiscoverStartPlugins } from './plugin';
import { createSavedSearchesLoader } from './saved_searches/saved_searches';
import type { SavedSearch } from './saved_searches/types';

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
  getSavedSearchById: (id?: string) => Promise<SavedSearch>;
  getSavedSearchUrlById: (id: string) => Promise<string>;
  getEmbeddableInjector: () => Promise<auto.IInjectorService>;
  uiSettings: IUiSettingsClient;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
}

export async function buildServices(
  core: CoreStart,
  plugins: DiscoverStartPlugins,
  context: PluginInitializerContext,
  getEmbeddableInjector: () => Promise<auto.IInjectorService>
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
    getSavedSearchById: async (id?: string) => savedObjectService.get(id),
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
    indexPatternFieldEditor: plugins.indexPatternFieldEditor,
  };
}
