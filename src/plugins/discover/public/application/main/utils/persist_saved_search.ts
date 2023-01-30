/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/public';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { SavedSearch, saveSavedSearch } from '@kbn/saved-search-plugin/public';
import { updateSavedSearch } from './update_saved_search';
import { addLog } from '../../../utils/add_log';
import { AppState } from '../services/discover_app_state_container';
import { DiscoverServices } from '../../../build_services';

/**
 * Helper function to update and persist the given savedSearch
 */
export async function persistSavedSearch(
  savedSearch: SavedSearch,
  {
    dataView,
    services,
    saveOptions,
    state,
  }: {
    dataView: DataView;
    saveOptions: SavedObjectSaveOpts;
    services: DiscoverServices;
    state: AppState;
  }
) {
  addLog('💾 [savedSearch] persistSavedSearch', savedSearch, state);
  updateSavedSearch({ savedSearch, dataView, state, services });

  return await saveSavedSearch(
    savedSearch,
    saveOptions,
    services.core.savedObjects.client,
    services.savedObjectsTagging
  );
}
