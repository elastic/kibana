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

import { State } from 'ui/state_management/state';
import { DataStart } from '../../../data/public';
import { DataPublicPluginStart as NpDataStart } from '../../../../../plugins/data/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';

const GLOBAL_STATE_SHARE_KEY = 'oss-kibana-cross-app-state';

/**
 * Helper function to sync the global state with the various state providers
 * when a local angular application mounts. There are three different ways
 * global state can be passed into the application:
 * * parameter in the URL hash - e.g. shared link
 * * state shared in the session storage - e.g. reload-navigation from another app.
 * * in-memory state in the data plugin exports (timefilter and filterManager) - e.g. default values
 *
 * This function looks up the three sources (earlier in the list means it takes precedence),
 * puts it into the globalState object and syncs it with the url.
 */
export function syncOnMount(
  globalState: State,
  data: DataStart,
  npData: NpDataStart,
  sessionStorage: Storage
) {
  // pull in global state information from the URL
  globalState.fetch();
  // remember whether there were info in the URL
  const hasGlobalURLState = Boolean(Object.keys(globalState.toObject()).length);

  // sync kibana platform state with the angular global state
  if (!globalState.time) {
    globalState.time = data.timefilter.timefilter.getTime();
  }
  if (!globalState.refreshInterval) {
    globalState.refreshInterval = data.timefilter.timefilter.getRefreshInterval();
  }
  if (!globalState.filters && npData.query.filterManager.getGlobalFilters().length > 0) {
    globalState.filters = npData.query.filterManager.getGlobalFilters();
  }
  // only inject cross app global state if there is none in the url itself (that takes precedence)
  if (hasGlobalURLState) {
    // set flag the global state is set from the URL
    globalState.$inheritedGlobalState = true;
  } else {
    Object.assign(globalState, sessionStorage.get(GLOBAL_STATE_SHARE_KEY) || {});
  }
  globalState.save();
}

/**
 * Helper function to sync the global state when a local angular application unmounts.
 * It will put the current global state into the session storage to be able to re-apply it
 * if the application mounts again even if another application won't retain the state in
 * the url.
 */
export function syncOnUnmount(globalState: State, sessionStorage: Storage) {
  sessionStorage.set(GLOBAL_STATE_SHARE_KEY, globalState.toObject());
}
