/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'src/core/server';
import { SavedObjectsClientContract, ISavedObjectsRepository } from 'kibana/server';
import { TIME_RANGE_DATA_MODES } from '../../common/enums';
import { findByValueEmbeddables } from '../../../dashboard/server';

export interface TimeseriesUsage {
  timeseries_use_last_value_mode_total: number;
}

interface VisState {
  type?: string;
  params?: any;
}

export const getStats = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract | ISavedObjectsRepository,
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

  const { body: esResponse } = await esClient.search<{
    visualization: { visState: string };
    updated_at: string;
  }>(searchParams);

  function telemetryUseLastValueMode(visState: VisState) {
    if (
      visState.type === 'metrics' &&
      visState.params.type !== 'timeseries' &&
      (!visState.params.time_range_mode ||
        visState.params.time_range_mode === TIME_RANGE_DATA_MODES.LAST_VALUE)
    ) {
      timeseriesUsage.timeseries_use_last_value_mode_total++;
    }
  }

  if (esResponse?.hits?.hits?.length) {
    for (const hit of esResponse.hits.hits) {
      if (hit._source && 'visualization' in hit._source) {
        const { visualization } = hit._source!;

        let visState: VisState = {};
        try {
          visState = JSON.parse(visualization?.visState ?? '{}');
        } catch (e) {
          // invalid visState
        }

        telemetryUseLastValueMode(visState);
      }
    }
  }

  const byValueVisualizations = await findByValueEmbeddables(soClient, 'visualization');

  for (const item of byValueVisualizations) {
    telemetryUseLastValueMode(item.savedVis as VisState);
  }

  return timeseriesUsage.timeseries_use_last_value_mode_total ? timeseriesUsage : undefined;
};
