/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Query } from '../../../common';
import { getQueryLog } from './get_query_log';

interface AddToQueryLogDependencies {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
}

export function createAddToQueryLog({ storage, uiSettings }: AddToQueryLogDependencies) {
  /**
   * This function is to be used in conjunction with `<QueryStringInput />`.
   * It provides a way for external editors to add new filter entries to the
   * persisted query log which lives in `localStorage`. These entries are then
   * read by `<QueryStringInput />` and provided in the autocomplete options.
   *
   * @param appName Name of the app where this filter is added from.
   * @param query Filter value to add.
   */
  return function addToQueryLog(appName: string, { language, query }: Query) {
    const persistedLog = getQueryLog(uiSettings, storage, appName, language);
    persistedLog.add(query);
  };
}
