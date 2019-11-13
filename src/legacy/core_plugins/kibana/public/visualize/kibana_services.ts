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

import 'angular-sanitize'; // used in visualization_editor.js and visualization.js
import 'ui/collapsible_sidebar'; // used in default editor
import 'ui/vis/editors/default/sidebar';
// load directives
import '../../../data/public';

import { npStart } from 'ui/new_platform';
import angular from 'angular'; // just used in editor.js
import chromeLegacy from 'ui/chrome';

import uiRoutes from 'ui/routes';

// @ts-ignore
import { docTitle } from 'ui/doc_title';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { wrapInI18nContext } from 'ui/i18n';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { timefilter } from 'ui/timefilter';

// Saved objects
import { SavedObjectsClientProvider } from 'ui/saved_objects';
// @ts-ignore
import { SavedObject, SavedObjectProvider } from 'ui/saved_objects/saved_object';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';

import { createUiStatsReporter, METRIC_TYPE } from '../../../ui_metric/public';
import { start as visualizations } from '../../../visualizations/public/np_ready/public/legacy';
import { start as data } from '../../../data/public/legacy';
import { start as embeddables } from '../../../../core_plugins/embeddable_api/public/np_ready/public/legacy';

const services = {
  // new platform
  addBasePath: npStart.core.http.basePath.prepend,
  capabilities: npStart.core.application.capabilities,
  chrome: npStart.core.chrome,
  docLinks: npStart.core.docLinks,
  embeddable: npStart.plugins.embeddable,
  getBasePath: npStart.core.http.basePath.get,
  savedObjectsClient: npStart.core.savedObjects.client,
  toastNotifications: npStart.core.notifications.toasts,
  uiSettings: npStart.core.uiSettings,

  share: npStart.plugins.share,
  data,
  embeddables,
  visualizations,

  // legacy
  chromeLegacy,
  docTitle,
  FeatureCatalogueRegistryProvider,
  FilterBarQueryFilterProvider,
  getInjector: () => {
    return chromeLegacy.dangerouslyGetActiveInjector();
  },
  SavedObjectProvider,
  SavedObjectRegistryProvider,
  SavedObjectsClientProvider,
  timefilter,
  uiModules,
  uiRoutes,
  wrapInI18nContext,

  createUiStatsReporter,
};

export function getServices() {
  return services;
}

// export legacy static dependencies
export { angular };
export { getFromSavedObject } from 'ui/index_patterns';
export { PersistedState } from 'ui/persisted_state';
// @ts-ignore
export { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';
// @ts-ignore
export { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
export { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
export { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
export { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url';
export { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
export { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
export { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
export { unhashUrl } from 'ui/state_management/state_hashing';
export {
  Container,
  Embeddable,
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
} from '../../../../../plugins/embeddable/public';

// export types
export { METRIC_TYPE };
export { StaticIndexPattern } from 'ui/index_patterns';
export { AppState } from 'ui/state_management/app_state';
export { VisType } from 'ui/vis';

// export const
export { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

export { VisSavedObject } from './embeddable/visualize_embeddable';
