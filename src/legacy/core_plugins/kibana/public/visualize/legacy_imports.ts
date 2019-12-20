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

/**
 * The imports in this file are static functions and types which still live in legacy folders and are used
 * within dashboard. To consolidate them all in one place, they are re-exported from this file. Eventually
 * this list should become empty. Imports from the top level of shimmed or moved plugins can be imported
 * directly where they are needed.
 */

import chrome from 'ui/chrome';

export const legacyChrome = chrome;

// @ts-ignore
export { AppState, AppStateProvider } from 'ui/state_management/app_state';
export { State } from 'ui/state_management/state';
// @ts-ignore
export { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
export { StateManagementConfigProvider } from 'ui/state_management/config_provider';
export { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
export { PersistedState } from 'ui/persisted_state';

export { npSetup, npStart } from 'ui/new_platform';
export { IPrivate } from 'ui/private';
// @ts-ignore
export { PrivateProvider } from 'ui/private/private';

export { SavedObjectRegistryProvider } from 'ui/saved_objects';
export { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
export { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';

export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
export { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
// @ts-ignore
export { EventsProvider } from 'ui/events';
// @ts-ignore
export { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
export { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
export { confirmModalFactory } from 'ui/modals/confirm_modal';
export { configureAppAngularModule, ensureDefaultIndexPattern } from 'ui/legacy_compat';
export { registerTimefilterWithGlobalStateFactory } from 'ui/timefilter/setup_router';
// @ts-ignore
export { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';

// @ts-ignore
export { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url';
export { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url';
export { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';

// @ts-ignore
export { defaultEditor } from 'ui/vis/editors/default/default';
export { VisType } from 'ui/vis';
export { wrapInI18nContext } from 'ui/i18n';

export { DashboardConstants } from '../dashboard/np_ready/dashboard_constants';
export { VisSavedObject } from '../visualize_embeddable/visualize_embeddable';
export { VISUALIZE_EMBEDDABLE_TYPE } from '../visualize_embeddable';
export { VisualizeEmbeddableFactory } from '../visualize_embeddable/visualize_embeddable_factory';
