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
import { npStart } from 'ui/new_platform';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/saved_objects';
import { SavedObjectKibanaServices } from 'ui/saved_objects/types';
// @ts-ignore
import { savedObjectManagementRegistry } from '../../management/saved_object_registry';
import { createSavedSearchClass } from './_saved_search';

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedSearches',
  title: 'searches',
});

export function createSavedSearchesService(services: SavedObjectKibanaServices) {
  const SavedSearchClass = createSavedSearchClass(services);
  const savedSearchLoader = new SavedObjectLoader(
    SavedSearchClass,
    services.savedObjectsClient,
    services.chrome
  );
  // Customize loader properties since adding an 's' on type doesn't work for type 'search' .
  savedSearchLoader.loaderProperties = {
    name: 'searches',
    noun: 'Saved Search',
    nouns: 'saved searches',
  };

  savedSearchLoader.urlFor = (id: string) => `#/discover/${encodeURIComponent(id)}`;

  return savedSearchLoader;
}
// this is needed for saved object management
const module = uiModules.get('discover/saved_searches');
module.service('savedSearches', () => {
  const services = {
    savedObjectsClient: npStart.core.savedObjects.client,
    indexPatterns: npStart.plugins.data.indexPatterns,
    chrome: npStart.core.chrome,
    overlays: npStart.core.overlays,
  };
  return createSavedSearchesService(services);
});
