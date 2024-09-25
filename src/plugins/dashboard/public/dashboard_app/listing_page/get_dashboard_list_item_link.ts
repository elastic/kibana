/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryState } from '@kbn/data-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  DASHBOARD_APP_ID,
  createDashboardEditUrl,
  GLOBAL_STATE_STORAGE_KEY,
} from '../../dashboard_constants';
import { pluginServices } from '../../services/plugin_services';

export const getDashboardListItemLink = (
  kbnUrlStateStorage: IKbnUrlStateStorage,
  id: string,
  timeRestore: boolean
) => {
  const {
    application: { getUrlForApp },
    settings: { uiSettings },
  } = pluginServices.getServices();
  const useHash = uiSettings.get('state:storeInSessionStorage'); // use hash

  let url = getUrlForApp(DASHBOARD_APP_ID, {
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
