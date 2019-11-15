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
import 'ui/collapsible_sidebar';
import 'ui/directives/listen';
import 'ui/directives/storage';
import 'ui/fixed_scroll';
import 'ui/directives/css_truncate';

import { npStart } from 'ui/new_platform';
import chromeLegacy from 'ui/chrome';
import angular from 'angular'; // just used in embeddables and discover controller
import uiRoutes from 'ui/routes';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { SearchSource } from 'ui/courier';
// @ts-ignore
import { StateProvider } from 'ui/state_management/state';
// @ts-ignore
import { SavedObjectProvider } from 'ui/saved_objects/saved_object';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { timefilter } from 'ui/timefilter';
// @ts-ignore
import { IndexPattern, IndexPatterns } from 'ui/index_patterns';
import { wrapInI18nContext } from 'ui/i18n';
// @ts-ignore
import { docTitle } from 'ui/doc_title';
// @ts-ignore
import * as docViewsRegistry from 'ui/registry/doc_views';

const services = {
  // new plattform
  addBasePath: npStart.core.http.basePath.prepend,
  capabilities: npStart.core.application.capabilities,
  chrome: npStart.core.chrome,
  docLinks: npStart.core.docLinks,
  eui_utils: npStart.plugins.eui_utils,
  inspector: npStart.plugins.inspector,
  metadata: npStart.core.injectedMetadata.getLegacyMetadata(),
  toastNotifications: npStart.core.notifications.toasts,
  uiSettings: npStart.core.uiSettings,
  uiActions: npStart.plugins.uiActions,
  embeddable: npStart.plugins.embeddable,
  share: npStart.plugins.share,
  // legacy
  docTitle,
  docViewsRegistry,
  FilterBarQueryFilterProvider,
  getInjector: () => {
    return chromeLegacy.dangerouslyGetActiveInjector();
  },
  SavedObjectRegistryProvider,
  SavedObjectProvider,
  SearchSource,
  StateProvider,
  timefilter,
  uiModules,
  uiRoutes,
  wrapInI18nContext,
};
export function getServices() {
  return services;
}

// EXPORT legacy static dependencies
export { angular };
export { buildVislibDimensions } from 'ui/visualize/loader/pipeline_helpers/build_pipeline';
// @ts-ignore
export { callAfterBindingsWorkaround } from 'ui/compat';
export {
  getRequestInspectorStats,
  getResponseInspectorStats,
} from 'ui/courier/utils/courier_inspector_utils';
// @ts-ignore
export { hasSearchStategyForIndexPattern, isDefaultTypeIndexPattern } from 'ui/courier';
// @ts-ignore
export { intervalOptions } from 'ui/agg_types/buckets/_interval_options';
// @ts-ignore
export { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
// @ts-ignore
export { RequestAdapter } from 'ui/inspector/adapters';
export { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
export { FieldList } from 'ui/index_patterns';
export { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
export { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
// @ts-ignore
export { timezoneProvider } from 'ui/vis/lib/timezone';
// @ts-ignore
export { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
// @ts-ignore
export { tabifyAggResponse } from 'ui/agg_response/tabify';
// @ts-ignore
export { vislibSeriesResponseHandlerProvider } from 'ui/vis/response_handlers/vislib';
export { unhashUrl } from 'ui/state_management/state_hashing';

// EXPORT types
export { Vis } from 'ui/vis';
export { StaticIndexPattern, IndexPatterns, IndexPattern, FieldType } from 'ui/index_patterns';
export { SearchSource } from 'ui/courier';
export { ElasticSearchHit } from 'ui/registry/doc_views_types';
export { DocViewRenderProps, DocViewRenderFn } from 'ui/registry/doc_views';
export { Adapters } from 'ui/inspector/types';
