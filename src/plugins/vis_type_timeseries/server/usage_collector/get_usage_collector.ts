/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import { TIME_RANGE_DATA_MODES } from '../../common/timerange_data_modes';

type ESResponse = SearchResponse<{ visualization: { visState: string }; updated_at: string }>;

export interface TimeseriesUsage {
  timeseries_use_last_value_mode_total: number;
}

interface VisState {
  type?: string;
  params?: any;
}

export const getStats = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<TimeseriesUsage | undefined> => {
  const timeseriesUsage = {
    timeseries_use_last_value_mode_total: 0,
  };

  const searchParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._id', 'hits.hits._source.visualization'],
    body: {
      query: {
        bool: {
          filter: { term: { type: 'visualization' } },
        },
      },
    },
  };

  const { body: esResponse } = await esClient.search<ESResponse>(searchParams);
  const size = esResponse?.hits?.hits?.length ?? 0;

  if (!size) {
    return;
  }

  for (const hit of esResponse.hits.hits) {
    const visualization = hit._source?.visualization;
    let visState: VisState = {};
    try {
      visState = JSON.parse(visualization?.visState ?? '{}');
    } catch (e) {
      // invalid visState
    }

    if (
      visState.type === 'metrics' &&
      visState.params.time_range_mode === TIME_RANGE_DATA_MODES.LAST_VALUE
    ) {
      timeseriesUsage.timeseries_use_last_value_mode_total++;
    }
  }

  return timeseriesUsage.timeseries_use_last_value_mode_total ? timeseriesUsage : undefined;
};
