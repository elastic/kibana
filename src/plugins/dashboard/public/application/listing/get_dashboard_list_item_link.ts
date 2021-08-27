/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ApplicationStart } from '../../../../../core/public/application/types';
import type { QueryState } from '../../../../data/public/query/state_sync/types';
import { setStateToKbnUrl } from '../../../../kibana_utils/public/state_management/url/kbn_url_storage';
import type { IKbnUrlStateStorage } from '../../../../kibana_utils/public/state_sync/state_sync_state_storage/create_kbn_url_state_storage';
import { createDashboardEditUrl, DashboardConstants } from '../../dashboard_constants';
import { GLOBAL_STATE_STORAGE_KEY } from '../../url_generator';

export const getDashboardListItemLink = (
  application: ApplicationStart,
  kbnUrlStateStorage: IKbnUrlStateStorage,
  useHash: boolean,
  id: string,
  timeRestore: boolean
) => {
  let url = application.getUrlForApp(DashboardConstants.DASHBOARDS_ID, {
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
