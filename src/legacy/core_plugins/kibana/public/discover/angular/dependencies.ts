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
import 'ui/visualize';
import 'ui/fixed_scroll';
import 'ui/index_patterns';
import 'ui/state_management/app_state';
import 'ui/capabilities/route_setup';

import uiRoutes from 'ui/routes';
export { uiRoutes };

import angular from 'angular';
export { angular };

import { npStart } from 'ui/new_platform';
const { chrome } = npStart.core;
export { chrome };
export { npStart } from 'ui/new_platform';

// @ts-ignore
export { uiModules } from 'ui/modules';
export { IndexPattern, IndexPatterns, StaticIndexPattern } from 'ui/index_patterns';
export { wrapInI18nContext } from 'ui/i18n';
export { timefilter } from 'ui/timefilter';
export { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
export { i18n } from '@kbn/i18n';
export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
// @ts-ignore
export { callAfterBindingsWorkaround } from 'ui/compat';
// @ts-ignore
export { hasSearchStategyForIndexPattern, isDefaultTypeIndexPattern } from 'ui/courier';
export { toastNotifications } from 'ui/notify';
export { VisProvider } from 'ui/vis';
// @ts-ignore
export { vislibSeriesResponseHandlerProvider } from 'ui/vis/response_handlers/vislib';
// @ts-ignore
export { docTitle } from 'ui/doc_title';
// @ts-ignore
export { intervalOptions } from 'ui/agg_types/buckets/_interval_options';
export { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
// @ts-ignore
export { StateProvider } from 'ui/state_management/state';
export { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
// @ts-ignore
export { getFilterGenerator } from 'ui/filter_manager';
export { getDocLink } from 'ui/documentation_links';
export { showShareContextMenu, ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
// @ts-ignore
export { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
export { Inspector } from 'ui/inspector';
export { RequestAdapter } from 'ui/inspector/adapters';
export {
  getRequestInspectorStats,
  getResponseInspectorStats,
} from 'ui/courier/utils/courier_inspector_utils';
// @ts-ignore
export { tabifyAggResponse } from 'ui/agg_response/tabify';
export { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
export { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
export { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../breadcrumbs';
export { buildVislibDimensions } from 'ui/visualize/loader/pipeline_helpers/build_pipeline';

import './directives';
