/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import type { SavedVisState } from '@kbn/visualizations-plugin/common';
import { VIS_TYPE_TABLE } from '../../common';

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
  const finder = await soClient.createPointInTimeFinder({
    type: 'visualization',
    perPage: 1000,
    namespaces: ['*'],
  });

  const stats: VisTypeTableUsage = {
    total: 0,
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

  const doTelemetry = ({ aggs, params }: SavedVisState) => {
    stats.total += 1;

    const hasSplitAgg = aggs.find((agg) => agg.schema === 'split');

    if (hasSplitAgg) {
      stats.total_split += 1;

      const isSplitRow = params.row;
      const isSplitEnabled = hasSplitAgg.enabled;
      const container = isSplitRow ? stats.split_rows : stats.split_columns;

      container.total += 1;
      container.enabled = isSplitEnabled ? container.enabled + 1 : container.enabled;
    }
  };

  for await (const response of finder.find()) {
    (response.saved_objects || []).forEach(({ attributes }: SavedObjectsFindResult<any>) => {
      if (attributes?.visState) {
        try {
          const visState: SavedVisState = JSON.parse(attributes.visState);

          if (visState.type === VIS_TYPE_TABLE) {
            doTelemetry(visState);
          }
        } catch {
          // nothing to be here, "so" not valid
        }
      }
    });
  }
  await finder.close();

  return stats;
}
