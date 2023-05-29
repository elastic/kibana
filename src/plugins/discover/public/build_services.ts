/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';

import { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverServices } from '@kbn/unified-discover';
import { getHistory } from './kibana_services';
import { DiscoverStartPlugins } from './plugin';
import { DiscoverContextAppLocator } from '@kbn/unified-discover/src/context/locator';
import { DiscoverSingleDocLocator } from '@kbn/unified-discover/src/doc/locator';
import { DiscoverAppLocator } from '../common';

export const buildServices = memoize(function (
  core: CoreStart,
  plugins: DiscoverStartPlugins,
  context: PluginInitializerContext,
  locator: DiscoverAppLocator,
  contextLocator: DiscoverContextAppLocator,
  singleDocLocator: DiscoverSingleDocLocator
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
    dataViews: plugins.data.dataViews,
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
    unifiedSearch: plugins.unifiedSearch,
    lens: plugins.lens,
  };
});
