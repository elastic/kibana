/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IUiSettingsClient } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { Query } from '../../../common';
import { getQueryLog } from './get_query_log';

/** @internal */
export interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

interface AddFilterToQueryLogDependencies {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
}

export function createAddFilterToQueryLog({
  storage,
  uiSettings,
}: AddFilterToQueryLogDependencies) {
  /**
   * This function is to be used in conjunction with `<QueryStringInput />`.
   * It provides a way for external editors to add new filter entries to the
   * persisted query log which lives in `localStorage`. These entries are then
   * read by `<QueryStringInput />` and provided in the autocomplete options.
   *
   * @param appName Name of the app where this filter is added from.
   * @param filter Filter value to add. Retrieved from AggConfigs via agg.params.filters.
   */
  return function addFilterToQueryLog(appName: string, filter: FilterValue) {
    const persistedLog = getQueryLog(uiSettings, storage, appName, filter.input.language);
    persistedLog.add(filter.input.query);
  };
}
