/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { countBy, groupBy, mapValues, max, min, values } from 'lodash';
import type { SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { getPastDays } from './get_past_days';

import type { SavedVisState } from '../../common';

interface VisSummary {
  type: string;
  space: string;
  past_days: number;
}

export interface VisualizationUsage {
  [x: string]: {
    total: number;
    spaces_min?: number;
    spaces_max?: number;
    spaces_avg: number;
    saved_7_days_total: number;
    saved_30_days_total: number;
    saved_90_days_total: number;
  };
}

/*
 * Parse the response data into telemetry payload
 */
export async function getStats(
  soClient: SavedObjectsClientContract
): Promise<VisualizationUsage | undefined> {
  const finder = await soClient.createPointInTimeFinder({
    type: 'visualization',
    perPage: 1000,
    namespaces: ['*'],
  });

  const visSummaries: VisSummary[] = [];

  for await (const response of finder.find()) {
    (response.saved_objects || []).forEach((so: SavedObjectsFindResult<any>) => {
      if (so.attributes?.visState) {
        const visState: SavedVisState = JSON.parse(so.attributes.visState);

        visSummaries.push({
          type: visState.type ?? '_na_',
          space: so.namespaces?.[0] ?? 'default',
          past_days: getPastDays(so.updated_at!),
        });
      }
    });
  }
  await finder.close();

  if (visSummaries.length) {
    // organize stats per type
    const visTypes = groupBy(visSummaries, 'type');

    // get the final result
    return mapValues(visTypes, (curr) => {
      const total = curr.length;
      const spacesBreakdown = countBy(curr, 'space');
      const spaceCounts: number[] = values(spacesBreakdown);

      return {
        total,
        spaces_min: min(spaceCounts),
        spaces_max: max(spaceCounts),
        spaces_avg: total / spaceCounts.length,
        saved_7_days_total: curr.filter((c) => c.past_days <= 7).length,
        saved_30_days_total: curr.filter((c) => c.past_days <= 30).length,
        saved_90_days_total: curr.filter((c) => c.past_days <= 90).length,
      };
    });
  }
}
