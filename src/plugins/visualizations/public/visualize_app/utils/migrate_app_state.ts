/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, omit } from 'lodash';
import { VisualizeAppState } from '../types';

/**
 * Creates a new instance of AppState based on the table vis state.
 *
 * Dashboards have a similar implementation; see
 * src/plugins/dashboard/public/application/lib/migrate_app_state.ts
 *
 * @param appState {VisualizeAppState}
 */
export function migrateAppState(appState: VisualizeAppState) {
  // For BWC in pre 7.0 versions where table visualizations could have multiple aggs
  // with `schema === 'split'`. This ensures that bookmarked URLs with deprecated params
  // are rewritten to the correct state. See core_plugins/table_vis/migrations.
  if (appState.vis.type !== 'table') {
    return appState;
  }

  const visAggs: any = get(appState, 'vis.aggs');

  if (visAggs) {
    let splitCount = 0;
    const migratedAggs = visAggs.map((agg: any) => {
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
      return appState; // do nothing; we only want to touch tables with multiple split aggs
    }

    appState.vis.aggs = migratedAggs;
  }

  return appState;
}
