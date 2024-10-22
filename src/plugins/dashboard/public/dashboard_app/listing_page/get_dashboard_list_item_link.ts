/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryState } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage, setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';

import {
  DASHBOARD_APP_ID,
  DASHBOARD_STATE_STORAGE_KEY,
  GLOBAL_STATE_STORAGE_KEY,
  createDashboardEditUrl,
} from '../../dashboard_constants';
import { coreServices } from '../../services/kibana_services';
import { DASHBOARD_STATE_SESSION_KEY } from '../../services/dashboard_backup_service';

export const getDashboardListItemLink = (
  kbnUrlStateStorage: IKbnUrlStateStorage,
  id: string,
  timeRestore: boolean,
  spaceId?: string
) => {
  const useHash = coreServices.uiSettings.get('state:storeInSessionStorage'); // use hash

  let url = coreServices.application.getUrlForApp(DASHBOARD_APP_ID, {
    path: `#${createDashboardEditUrl(id)}`,
  });
  const globalStateInUrl = kbnUrlStateStorage.get<QueryState>(GLOBAL_STATE_STORAGE_KEY) || {};

  if (timeRestore) {
    delete globalStateInUrl.time;
    delete globalStateInUrl.refreshInterval;
  }
  url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, globalStateInUrl, { useHash }, url);

  // pull the filters off the session storage and put in the url if they exist
  const unsavedFiltersToUrl = JSON.parse(
    sessionStorage.getItem(DASHBOARD_STATE_SESSION_KEY) ?? '[]'
  );
  const unsavedFilters = spaceId && unsavedFiltersToUrl ? unsavedFiltersToUrl[spaceId] : undefined;
  if (unsavedFilters && unsavedFilters[id] && unsavedFilters[id].filters) {
    const appStateInUrl = kbnUrlStateStorage.get<QueryState>(DASHBOARD_STATE_STORAGE_KEY) || {};
    appStateInUrl.filters = unsavedFilters[id].filters;

    url = setStateToKbnUrl<QueryState>(
      DASHBOARD_STATE_STORAGE_KEY,
      appStateInUrl,
      { useHash },
      url
    );
  }
  return url;
};
