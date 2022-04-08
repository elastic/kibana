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
} from 'kibana/public';
import {
  FilterManager,
  TimefilterContract,
  DataViewsContract,
  DataPublicPluginStart,
} from 'src/plugins/data/public';
import { Start as InspectorPublicPluginStart } from 'src/plugins/inspector/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import { UiCounterMetricType } from '@kbn/analytics';
import { Storage } from '../../kibana_utils/public';

import { DiscoverStartPlugins } from './plugin';
import { getHistory } from './kibana_services';
import { UrlForwardingStart } from '../../url_forwarding/public';
import { NavigationPublicPluginStart } from '../../navigation/public';
import { IndexPatternFieldEditorStart } from '../../data_view_field_editor/public';
import { FieldFormatsStart } from '../../field_formats/public';
import { EmbeddableStart } from '../../embeddable/public';
import { DiscoverAppLocator } from './locator';

import type { SpacesApi } from '../../../../x-pack/plugins/spaces/public';
import { DataViewEditorStart } from '../../../plugins/data_view_editor/public';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../../x-pack/plugins/triggers_actions_ui/public';

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
