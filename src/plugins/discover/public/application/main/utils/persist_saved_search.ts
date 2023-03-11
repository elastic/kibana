/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { SavedSearch, saveSavedSearch } from '@kbn/saved-search-plugin/public';
import { addLog } from '../../../utils/add_log';
import { DiscoverServices } from '../../../build_services';

/**
 * Helper function to update and persist the given savedSearch
 */
export async function persistSavedSearch(
  savedSearch: SavedSearch,
  {
    services,
    saveOptions,
  }: {
    saveOptions?: SavedObjectSaveOpts;
    services: DiscoverServices;
  }
) {
  addLog('[savedSearch] persistSavedSearch');

  return await saveSavedSearch(
    savedSearch,
    saveOptions || {},
    services.core.savedObjects.client,
    services.savedObjectsTagging
  );
}
