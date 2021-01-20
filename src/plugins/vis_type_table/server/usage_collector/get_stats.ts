/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ISavedObjectsRepository, SavedObjectsClientContract } from 'kibana/server';
import {
  SavedVisState,
  VisualizationSavedObjectAttributes,
} from 'src/plugins/visualizations/common';
import { TableVisParams, VIS_TYPE_TABLE } from '../../common';

export interface VisTypeTableUsage {
  /**
   * Total number of table type visualizations
   */
  total: number;
  /**
   * Total number of table visualizations, using "Split table" agg
   */
  total_split: number;
  /**
   * Split table by columns stats
   */
  split_columns: {
    total: number;
    enabled: number;
  };
  /**
   * Split table by rows stats
   */
  split_rows: {
    total: number;
    enabled: number;
  };
}

/*
 * Parse the response data into telemetry payload
 */
export async function getStats(
  soClient: SavedObjectsClientContract | ISavedObjectsRepository
): Promise<VisTypeTableUsage | undefined> {
  const visualizations = await soClient.find<VisualizationSavedObjectAttributes>({
    type: 'visualization',
    perPage: 10000,
  });

  const tableVisualizations = visualizations.saved_objects
    .map<SavedVisState<TableVisParams>>(({ attributes }) => JSON.parse(attributes.visState))
    .filter(({ type }) => type === VIS_TYPE_TABLE);

  const defaultStats = {
    total: tableVisualizations.length,
    total_split: 0,
    split_columns: {
      total: 0,
      enabled: 0,
    },
    split_rows: {
      total: 0,
      enabled: 0,
    },
  };

  return tableVisualizations.reduce((acc, { aggs, params }) => {
    const hasSplitAgg = aggs.find((agg) => agg.schema === 'split');

    if (hasSplitAgg) {
      acc.total_split += 1;

      const isSplitRow = params.row;
      const isSplitEnabled = hasSplitAgg.enabled;

      const container = isSplitRow ? acc.split_rows : acc.split_columns;
      container.total += 1;
      container.enabled = isSplitEnabled ? container.enabled + 1 : container.enabled;
    }

    return acc;
  }, defaultStats);
}
