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

import 'ui/directives/kbn_href';

import { npStart } from 'ui/new_platform';
import chromeLegacy from 'ui/chrome';
import angular from 'angular';

import uiRoutes from 'ui/routes';
import { wrapInI18nContext } from 'ui/i18n';

// @ts-ignore
import { uiModules } from 'ui/modules';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';

// Filters
import { timefilter } from 'ui/timefilter';

// Saved objects
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
// @ts-ignore
import { SavedObjectProvider } from 'ui/saved_objects/saved_object';

const services = {
  // new platform
  capabilities: npStart.core.application.capabilities,
  chrome: npStart.core.chrome,
  docLinks: npStart.core.docLinks,
  toastNotifications: npStart.core.notifications.toasts,
  uiSettings: npStart.core.uiSettings,
  savedObjectsClient: npStart.core.savedObjects.client,
  addBasePath: npStart.core.http.basePath.prepend,

  // legacy
  angular,
  uiRoutes,
  uiModules,
  FeatureCatalogueRegistryProvider,
  SavedObjectRegistryProvider,
  SavedObjectsClientProvider,
  SavedObjectProvider,
  timefilter,
  wrapInI18nContext,
};
export function getServices() {
  return services;
}

// export types
export { VisSavedObject } from 'ui/visualize/loader/types';

// const
export { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
