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
  GLOBAL_STATE_STORAGE_KEY,
  createDashboardEditUrl,
} from '../../dashboard_constants';
import { coreServices } from '../../services/kibana_services';

export const getDashboardListItemLink = (
  kbnUrlStateStorage: IKbnUrlStateStorage,
  id: string,
  timeRestore: boolean
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
  return url;
};
