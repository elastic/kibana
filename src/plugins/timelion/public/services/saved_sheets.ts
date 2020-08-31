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

import { SavedObjectLoader } from '../../../saved_objects/public';
import { createSavedSheetClass } from './_saved_sheet';
import { RenderDeps } from '../application';

export function initSavedSheetService(app: angular.IModule, deps: RenderDeps) {
  const savedObjectsClient = deps.core.savedObjects.client;
  const services = {
    savedObjectsClient,
    indexPatterns: deps.plugins.data.indexPatterns,
    search: deps.plugins.data.search,
    chrome: deps.core.chrome,
    overlays: deps.core.overlays,
  };

  const SavedSheet = createSavedSheetClass(services, deps.core.uiSettings);

  const savedSheetLoader = new SavedObjectLoader(SavedSheet, savedObjectsClient, deps.core.chrome);
  savedSheetLoader.urlFor = (id) => `#/${encodeURIComponent(id)}`;
  // Customize loader properties since adding an 's' on type doesn't work for type 'timelion-sheet'.
  savedSheetLoader.loaderProperties = {
    name: 'timelion-sheet',
    noun: 'Saved Sheets',
    nouns: 'saved sheets',
  };
  // This is the only thing that gets injected into controllers
  app.service('savedSheets', function () {
    return savedSheetLoader;
  });

  return savedSheetLoader;
}
