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
import 'ui/fixed_scroll';

import chromeLegacy from 'ui/chrome'; // just used in embeddables
import angular from 'angular'; // just used in embeddables and discover controller
import { npStart } from 'ui/new_platform';

import uiRoutes from 'ui/routes';
// @ts-ignore
import { uiModules } from 'ui/modules';

// COURIER

import { SearchSource } from 'ui/courier';
// @ts-ignore
import { hasSearchStategyForIndexPattern, isDefaultTypeIndexPattern } from 'ui/courier';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
} from 'ui/courier/utils/courier_inspector_utils';
// @ts-ignore
import { RequestAdapter } from 'ui/inspector/adapters';

// STATE MANAGEMENT

// @ts-ignore
import { StateProvider } from 'ui/state_management/state';
// @ts-ignore
import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';

// FILTERS

// @ts-ignore
import { getFilterGenerator } from 'ui/filter_manager';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
export { timefilter } from 'ui/timefilter';

// OTHERS

import { showShareContextMenu, ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
// @ts-ignore
import { IndexPattern, IndexPatterns, StaticIndexPattern, FieldList } from 'ui/index_patterns';
import { wrapInI18nContext } from 'ui/i18n';
import { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
// @ts-ignore
import { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
// @ts-ignore
import { callAfterBindingsWorkaround } from 'ui/compat';
// @ts-ignore
import { vislibSeriesResponseHandlerProvider } from 'ui/vis/response_handlers/vislib';
// @ts-ignore
import { intervalOptions } from 'ui/agg_types/buckets/_interval_options';
import { getDocLink } from 'ui/documentation_links';
// @ts-ignore
import { tabifyAggResponse } from 'ui/agg_response/tabify';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { buildVislibDimensions } from 'ui/visualize/loader/pipeline_helpers/build_pipeline';
// @ts-ignore
import { docTitle } from 'ui/doc_title';
// @ts-ignore
import { VisProvider } from 'ui/vis';

const { chrome } = npStart.core;
const { capabilities } = npStart.core.application;
const toastNotifications = npStart.core.notifications.toasts;

/** migration of to ad getServices function
const services = {
  angular,
  capabilities,
  chrome,
  docTitle,
  npStart,
  SearchSource,
  StateProvider,
  toastNotifications,
  uiModules,
  uiRoutes,
};

export function getServices() {
  return services;
}**/

export {
  angular,
  buildVislibDimensions,
  callAfterBindingsWorkaround,
  capabilities,
  chrome,
  chromeLegacy,
  docTitle,
  FieldList,
  FilterBarQueryFilterProvider,
  getDocLink,
  getFilterGenerator,
  getRequestInspectorStats,
  getResponseInspectorStats,
  getUnhashableStatesProvider,
  hasSearchStategyForIndexPattern,
  IndexPattern,
  IndexPatterns,
  intervalOptions,
  isDefaultTypeIndexPattern,
  migrateLegacyQuery,
  npStart,
  RequestAdapter,
  SavedObjectSaveModal,
  SearchSource,
  ShareContextMenuExtensionsRegistryProvider,
  showSaveModal,
  showShareContextMenu,
  stateMonitorFactory,
  StateProvider,
  StaticIndexPattern,
  subscribeWithScope,
  tabifyAggResponse,
  toastNotifications,
  uiModules,
  uiRoutes,
  vislibSeriesResponseHandlerProvider,
  VisProvider, // type
  wrapInI18nContext,
};
