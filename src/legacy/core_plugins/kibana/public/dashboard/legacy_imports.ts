
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
export { SaveOptions } from 'ui/saved_objects/saved_object';
export { npSetup, npStart } from 'ui/new_platform';
export { SavedObjectRegistryProvider } from 'ui/saved_objects';
export { IPrivate } from 'ui/private';
export { ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
export { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
// @ts-ignore
export { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';
export { showSaveModal, SaveResult } from 'ui/saved_objects/show_saved_object_save_modal';
export { showShareContextMenu } from 'ui/share';
export { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
export { KbnUrl } from 'ui/url/kbn_url';
import { IPrivate } from 'ui/private';
import { GlobalStateProvider } from 'ui/state_management/global_state';
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
import { AppStateProvider } from 'ui/state_management/app_state';
import { PrivateProvider } from 'ui/private/private';
import { EventsProvider } from 'ui/events';
import { PersistedState } from 'ui/persisted_state';
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
import { PromiseServiceCreator } from 'ui/promises/promises';
import { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url';
import { confirmModalFactory } from 'ui/modals/confirm_modal';
import { configureAppAngularModule } from 'ui/legacy_compat';
