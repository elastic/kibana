/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from 'kibana/server';
import { SavedVisState } from 'src/plugins/visualizations/common';
import { TableVisParams, VIS_TYPE_TABLE } from '../../common';

// elasticsearch index.max_result_window default value
const ES_MAX_RESULT_WINDOW_DEFAULT_VALUE = 1000;

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

/** @internal **/
type SavedTableVisState = SavedVisState<TableVisParams>;

/*
 * Parse the response data into telemetry payload
 */
export async function getStats(
  soClient: SavedObjectsClientContract | ISavedObjectsRepository
): Promise<VisTypeTableUsage | undefined> {
  const finder = await soClient.createPointInTimeFinder({
    type: 'visualization',
    perPage: ES_MAX_RESULT_WINDOW_DEFAULT_VALUE,
  });

  let tableVisualizations: SavedTableVisState[] = [];

  for await (const response of finder.find()) {
    tableVisualizations = [
      ...tableVisualizations,
      ...(response.saved_objects || []).reduce(
        (acc: SavedTableVisState[], { attributes }: SavedObjectsFindResult<any>) => {
          if (attributes?.visState) {
            try {
              const visState: SavedVisState = JSON.parse(attributes.visState);

              if (visState.type === VIS_TYPE_TABLE) {
                acc.push(visState as SavedTableVisState);
              }
            } catch {
              // nothing to be here, "so" not valid
            }
          }
          return acc;
        },
        []
      ),
    ];

    if (!response.saved_objects.length) {
      await finder.close();
    }
  }

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
