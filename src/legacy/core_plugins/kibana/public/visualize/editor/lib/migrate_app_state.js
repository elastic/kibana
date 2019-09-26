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

import { get, omit } from 'lodash';

/**
 * Creates a new instance of AppState based on the table vis state.
 *
 * Dashboards have a similar implementation; see
 * core_plugins/kibana/public/dashboard/lib/migrate_app_state
 *
 * @param appState {AppState} AppState class to instantiate
 */
export function migrateAppState(appState) {
  // For BWC in pre 7.0 versions where table visualizations could have multiple aggs
  // with `schema === 'split'`. This ensures that bookmarked URLs with deprecated params
  // are rewritten to the correct state. See core_plugins/table_vis/migrations.
  if (appState.vis.type !== 'table') {
    return;
  }

  const visAggs = get(appState, 'vis.aggs', []);
  let splitCount = 0;
  const migratedAggs = visAggs.map(agg => {
    if (agg.schema !== 'split') {
      return agg;
    }

    splitCount++;
    if (splitCount === 1) {
      return agg; // leave the first split agg unchanged
    }
    agg.schema = 'bucket';
    // the `row` param is exclusively used by split aggs, so we remove it
    agg.params = omit(agg.params, ['row']);
    return agg;
  });

  if (splitCount <= 1) {
    return; // do nothing; we only want to touch tables with multiple split aggs
  }

  appState.vis.aggs = migratedAggs;
  appState.save();
}
