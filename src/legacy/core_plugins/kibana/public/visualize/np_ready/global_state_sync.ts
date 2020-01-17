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

import { State } from '../legacy_imports';
import { DataPublicPluginStart as DataStart } from '../../../../../../plugins/data/public';

/**
 * Helper function to sync the global state with the various state providers
 * when a local angular application mounts. There are three different ways
 * global state can be passed into the application:
 * * parameter in the URL hash - e.g. shared link
 * * in-memory state in the data plugin exports (timefilter and filterManager) - e.g. default values
 *
 * This function looks up the three sources (earlier in the list means it takes precedence),
 * puts it into the globalState object and syncs it with the url.
 *
 * Currently the legacy chrome takes care of restoring the global state when navigating from
 * one app to another - to migrate away from that it will become necessary to also write the current
 * state to local storage
 */
export function syncOnMount(
  globalState: State,
  {
    query: {
      filterManager,
      timefilter: { timefilter },
    },
  }: DataStart
) {
  // pull in global state information from the URL
  globalState.fetch();
  // remember whether there were info in the URL
  const hasGlobalURLState = Boolean(Object.keys(globalState.toObject()).length);

  // sync kibana platform state with the angular global state
  if (!globalState.time) {
    globalState.time = timefilter.getTime();
  }
  if (!globalState.refreshInterval) {
    globalState.refreshInterval = timefilter.getRefreshInterval();
  }
  if (!globalState.filters && filterManager.getGlobalFilters().length > 0) {
    globalState.filters = filterManager.getGlobalFilters();
  }
  // only inject cross app global state if there is none in the url itself (that takes precedence)
  if (hasGlobalURLState) {
    // set flag the global state is set from the URL
    globalState.$inheritedGlobalState = true;
  }
  globalState.save();
}
