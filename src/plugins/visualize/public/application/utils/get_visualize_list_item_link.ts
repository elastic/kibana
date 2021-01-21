/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { ApplicationStart } from 'kibana/public';
import { QueryState } from '../../../../data/public';
import { setStateToKbnUrl } from '../../../../kibana_utils/public';
import { getQueryService, getUISettings } from '../../services';
import { GLOBAL_STATE_STORAGE_KEY } from '../../../common/constants';

export const getVisualizeListItem = (
  application: ApplicationStart,
  editApp: string | undefined,
  editUrl: string
) => {
  // for visualizations the editApp is undefined
  let url = application.getUrlForApp(editApp ?? 'visualize', {
    path: editApp ? editUrl : `/#${editUrl}`,
  });
  const queryState: QueryState = {};
  const timeRange = getQueryService().timefilter.timefilter.getTime();
  if (timeRange) queryState.time = timeRange;

  const useHash = getUISettings().get('state:storeInSessionStorage');
  url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, queryState, { useHash }, url);
  return url;
};
