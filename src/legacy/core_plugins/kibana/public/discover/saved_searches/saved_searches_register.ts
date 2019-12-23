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
// @ts-ignore
import { savedObjectManagementRegistry } from '../../management/saved_object_registry';

import { createSavedSearchesService } from './saved_searches';

// this is needed for saved object management
// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedSearches',
  title: 'searches',
});
const services = {
  savedObjectsClient: npStart.core.savedObjects.client,
  indexPatterns: npStart.plugins.data.indexPatterns,
  chrome: npStart.core.chrome,
  overlays: npStart.core.overlays,
};
const savedSearches = createSavedSearchesService(services);

const module = uiModules.get('discover/saved_searches');
module.service('savedSearches', () => savedSearches);
