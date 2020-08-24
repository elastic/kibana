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

import { pick } from 'lodash';

import { PluginsSetup, PluginsStart } from './new_platform';
import { LegacyCoreSetup, LegacyCoreStart } from '../../../../core/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import * as dataServices from '../../../../plugins/data/public/services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import * as visualizationsServices from '../../../../plugins/visualizations/public/services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createSavedVisLoader } from '../../../../plugins/visualizations/public/saved_visualizations/saved_visualizations';

interface NpSetup {
  core: LegacyCoreSetup;
  plugins: PluginsSetup;
}

interface NpStart {
  core: LegacyCoreStart;
  plugins: PluginsStart;
}

export function setSetupServices(npSetup: NpSetup) {
  // Services that need to be set in the legacy platform since the legacy data plugin
  // which previously provided them has been removed.
  visualizationsServices.setUISettings(npSetup.core.uiSettings);
  visualizationsServices.setUsageCollector(npSetup.plugins.usageCollection);
}

export function setStartServices(npStart: NpStart) {
  // Services that need to be set in the legacy platform since the legacy data plugin
  // which previously provided them has been removed.
  dataServices.setNotifications(npStart.core.notifications);
  dataServices.setOverlays(npStart.core.overlays);
  dataServices.setUiSettings(npStart.core.uiSettings);
  dataServices.setFieldFormats(npStart.plugins.data.fieldFormats);
  dataServices.setIndexPatterns(npStart.plugins.data.indexPatterns);
  dataServices.setQueryService(npStart.plugins.data.query);
  dataServices.setSearchService(npStart.plugins.data.search);

  visualizationsServices.setI18n(npStart.core.i18n);
  visualizationsServices.setTypes(
    pick(npStart.plugins.visualizations, ['get', 'all', 'getAliases'])
  );
  visualizationsServices.setCapabilities(npStart.core.application.capabilities);
  visualizationsServices.setHttp(npStart.core.http);
  visualizationsServices.setApplication(npStart.core.application);
  visualizationsServices.setEmbeddable(npStart.plugins.embeddable);
  visualizationsServices.setSavedObjects(npStart.core.savedObjects);
  visualizationsServices.setIndexPatterns(npStart.plugins.data.indexPatterns);
  visualizationsServices.setFilterManager(npStart.plugins.data.query.filterManager);
  visualizationsServices.setExpressions(npStart.plugins.expressions);
  visualizationsServices.setUiActions(npStart.plugins.uiActions);
  visualizationsServices.setTimeFilter(npStart.plugins.data.query.timefilter.timefilter);
  visualizationsServices.setAggs(npStart.plugins.data.search.aggs);
  visualizationsServices.setOverlays(npStart.core.overlays);
  visualizationsServices.setChrome(npStart.core.chrome);
  visualizationsServices.setSearch(npStart.plugins.data.search);
  const savedVisualizationsLoader = createSavedVisLoader({
    savedObjectsClient: npStart.core.savedObjects.client,
    indexPatterns: npStart.plugins.data.indexPatterns,
    search: npStart.plugins.data.search,
    chrome: npStart.core.chrome,
    overlays: npStart.core.overlays,
    visualizationTypes: visualizationsServices.getTypes(),
  });
  visualizationsServices.setSavedVisualizationsLoader(savedVisualizationsLoader);
  visualizationsServices.setSavedSearchLoader(npStart.plugins.discover.savedSearchLoader);
}
