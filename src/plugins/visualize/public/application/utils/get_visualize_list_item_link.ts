/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { ApplicationStart } from 'kibana/public';
import { IKbnUrlStateStorage } from 'src/plugins/kibana_utils/public';
import { QueryState } from '../../../../data/public';
import { setStateToKbnUrl } from '../../../../kibana_utils/public';
import { getUISettings } from '../../services';
import { GLOBAL_STATE_STORAGE_KEY } from '../../../common/constants';
import { APP_NAME } from '../visualize_constants';

export const getVisualizeListItemLink = (
  application: ApplicationStart,
  kbnUrlStateStorage: IKbnUrlStateStorage,
  editApp: string | undefined,
  editUrl: string
) => {
  // for visualizations the editApp is undefined
  let url = application.getUrlForApp(editApp ?? APP_NAME, {
    path: editApp ? editUrl : `#${editUrl}`,
  });
  const useHash = getUISettings().get('state:storeInSessionStorage');
  const globalStateInUrl = kbnUrlStateStorage.get<QueryState>(GLOBAL_STATE_STORAGE_KEY) || {};

  url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, globalStateInUrl, { useHash }, url);
  return url;
};
