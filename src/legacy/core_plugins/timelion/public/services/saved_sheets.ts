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
import { SavedObjectLoader } from 'ui/saved_objects';
// @ts-ignore
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { createSavedSheetClass } from './_saved_sheet';

const module = uiModules.get('app/sheet');

const savedObjectsClient = npStart.core.savedObjects.client;
const services = {
  savedObjectsClient,
  indexPatterns: npStart.plugins.data.indexPatterns,
  chrome: npStart.core.chrome,
  overlays: npStart.core.overlays,
};

const SavedSheet = createSavedSheetClass(services, npStart.core.uiSettings);

export const savedSheetLoader = new SavedObjectLoader(
  SavedSheet,
  savedObjectsClient,
  npStart.core.chrome
);
savedSheetLoader.urlFor = id => `#/${encodeURIComponent(id)}`;
// Customize loader properties since adding an 's' on type doesn't work for type 'timelion-sheet'.
savedSheetLoader.loaderProperties = {
  name: 'timelion-sheet',
  noun: 'Saved Sheets',
  nouns: 'saved sheets',
};

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  id: 'savedSheets',
  service: savedSheetLoader,
  title: 'sheets',
});

// This is the only thing that gets injected into controllers
module.service('savedSheets', () => savedSheetLoader);
