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

import { SavedObjectLoader, SavedObjectsClientProvider } from 'ui/saved_objects';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import { uiModules } from 'ui/modules';
import './_saved_sheet.js';
import { npStart } from '../../../../ui/public/new_platform';

const module = uiModules.get('app/sheet');

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedSheets',
  title: 'sheets',
});

// This is the only thing that gets injected into controllers
module.service('savedSheets', function(Private, SavedSheet, kbnUrl) {
  const savedObjectClient = Private(SavedObjectsClientProvider);
  const savedSheetLoader = new SavedObjectLoader(
    SavedSheet,
    savedObjectClient,
    npStart.core.chrome
  );
  savedSheetLoader.urlFor = function(id) {
    return kbnUrl.eval('#/{{id}}', { id: id });
  };

  // Customize loader properties since adding an 's' on type doesn't work for type 'timelion-sheet'.
  savedSheetLoader.loaderProperties = {
    name: 'timelion-sheet',
    noun: 'Saved Sheets',
    nouns: 'saved sheets',
  };
  return savedSheetLoader;
});
