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

export function injectVars(server) {
  const serverConfig = server.config();

  // Get types that are import and exportable, by default yes unless isImportableAndExportable is set to false
  const { types: allTypes } = server.savedObjects;
  const savedObjectsManagement = server.getSavedObjectsManagement();
  const importAndExportableTypes = allTypes.filter(type =>
    savedObjectsManagement.isImportAndExportable(type)
  );

  return {
    kbnDefaultAppId: serverConfig.get('kibana.defaultAppId'),
    disableWelcomeScreen: serverConfig.get('kibana.disableWelcomeScreen'),
    importAndExportableTypes,
    autocompleteTerminateAfter: serverConfig.get('kibana.autocompleteTerminateAfter'),
    autocompleteTimeout: serverConfig.get('kibana.autocompleteTimeout'),
  };
}
