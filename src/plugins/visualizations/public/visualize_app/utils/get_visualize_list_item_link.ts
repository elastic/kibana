/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApplicationStart } from '@kbn/core/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { QueryState } from '@kbn/data-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { getUISettings } from '../../services';
import { GLOBAL_STATE_STORAGE_KEY, VISUALIZE_APP_NAME } from '../../../common/constants';

export const getVisualizeListItemLink = (
  application: ApplicationStart,
  kbnUrlStateStorage: IKbnUrlStateStorage,
  editApp: string | undefined,
  editUrl: string
) => {
  // for visualizations the editApp is undefined
  let url = application.getUrlForApp(editApp ?? VISUALIZE_APP_NAME, {
    path: editApp ? editUrl : `#${editUrl}`,
  });
  const useHash = getUISettings().get('state:storeInSessionStorage');
  const globalStateInUrl = kbnUrlStateStorage.get<QueryState>(GLOBAL_STATE_STORAGE_KEY) || {};

  url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, globalStateInUrl, { useHash }, url);
  return url;
};
