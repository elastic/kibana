/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { countBy, get, groupBy, mapValues, max, min, values } from 'lodash';
import { ElasticsearchClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';

import { getPastDays } from './get_past_days';
type ESResponse = SearchResponse<{ visualization: { visState: string } }>;

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
  esClient: ElasticsearchClient,
  index: string
): Promise<VisualizationUsage | undefined> {
  const searchParams = {
    size: 10000, // elasticsearch index.max_result_window default value
    index,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._id',
      'hits.hits._source.visualization',
      'hits.hits._source.updated_at',
    ],
    body: {
      query: {
        bool: { filter: { term: { type: 'visualization' } } },
      },
    },
  };
  const { body: esResponse } = await esClient.search<ESResponse>(searchParams);
  const size = get(esResponse, 'hits.hits.length', 0);
  if (size < 1) {
    return;
  }

  // `map` to get the raw types
  const visSummaries: VisSummary[] = esResponse.hits.hits.map((hit) => {
    const spacePhrases = hit._id.split(':');
    const lastUpdated: string = get(hit, '_source.updated_at');
    const space = spacePhrases.length === 3 ? spacePhrases[0] : 'default'; // if in a custom space, the format of a saved object ID is space:type:id
    const visualization = get(hit, '_source.visualization', { visState: '{}' });
    const visState: { type?: string } = JSON.parse(visualization.visState);
    return {
      type: visState.type || '_na_',
      space,
      past_days: getPastDays(lastUpdated),
    };
  });

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
