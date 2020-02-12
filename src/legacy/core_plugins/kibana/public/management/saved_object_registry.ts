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

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { npStart } from 'ui/new_platform';
import { SavedObjectLoader } from '../../../../../plugins/saved_objects/public';
import { createSavedDashboardLoader } from '../dashboard';
import { createSavedSearchesLoader } from '../discover';
import { TypesService, createSavedVisLoader } from '../../../visualizations/public';

/**
 * This registry is used for the editing mode of Saved Searches, Visualizations,
 * Dashboard and Time Lion saved objects.
 */
interface SavedObjectRegistryEntry {
  id: string;
  service: SavedObjectLoader;
  title: string;
}

const registry: SavedObjectRegistryEntry[] = [];

export const savedObjectManagementRegistry = {
  register: (service: SavedObjectRegistryEntry) => {
    registry.push(service);
  },
  all: () => {
    return registry;
  },
  get: (id: string) => {
    return _.find(registry, { id });
  },
};

const services = {
  savedObjectsClient: npStart.core.savedObjects.client,
  indexPatterns: npStart.plugins.data.indexPatterns,
  chrome: npStart.core.chrome,
  overlays: npStart.core.overlays,
};

savedObjectManagementRegistry.register({
  id: 'savedVisualizations',
  service: createSavedVisLoader({
    ...services,
    ...{ visualizationTypes: new TypesService().start() },
  }),
  title: 'visualizations',
});

savedObjectManagementRegistry.register({
  id: 'savedDashboards',
  service: createSavedDashboardLoader(services),
  title: i18n.translate('kbn.dashboard.savedDashboardsTitle', {
    defaultMessage: 'dashboards',
  }),
});

savedObjectManagementRegistry.register({
  id: 'savedSearches',
  service: createSavedSearchesLoader(services),
  title: 'searches',
});
