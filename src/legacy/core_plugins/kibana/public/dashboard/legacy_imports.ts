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
export { State } from 'ui/state_management/state';
export { AppState } from 'ui/state_management/app_state';
export { AppStateClass } from 'ui/state_management/app_state';
export { SavedObjectSaveOpts } from 'ui/saved_objects/types';
export { npSetup, npStart } from 'ui/new_platform';
export { SavedObjectRegistryProvider } from 'ui/saved_objects';
export { IPrivate } from 'ui/private';
export { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
// @ts-ignore
export { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';
export { showSaveModal, SaveResult } from 'ui/saved_objects/show_saved_object_save_modal';
export { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
export { KbnUrl } from 'ui/url/kbn_url';
// @ts-ignore
export { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
export { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
export { AppStateProvider } from 'ui/state_management/app_state';
// @ts-ignore
export { PrivateProvider } from 'ui/private/private';
// @ts-ignore
export { EventsProvider } from 'ui/events';
export { PersistedState } from 'ui/persisted_state';
// @ts-ignore
export { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
export { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
export { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url/index';
// @ts-ignore
export { confirmModalFactory } from 'ui/modals/confirm_modal';
export { configureAppAngularModule } from 'ui/legacy_compat';
export { stateMonitorFactory, StateMonitor } from 'ui/state_management/state_monitor_factory';
export { ensureDefaultIndexPattern } from 'ui/legacy_compat';
export { unhashUrl } from '../../../../../plugins/kibana_utils/public';
export { IInjector } from 'ui/chrome';
export { VISUALIZE_EMBEDDABLE_TYPE } from '../visualize_embeddable';
export { registerTimefilterWithGlobalStateFactory } from 'ui/timefilter/setup_router';
