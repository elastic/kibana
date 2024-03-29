/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { getLastValue } from '../../../../common/last_value_utils';
import { overwrite, getActiveSeries } from '../helpers';
import { buildTableResponse } from './build_response_body';
import { createFieldsFetcher } from '../../search_strategies/lib/fields_fetcher';

import type { Panel } from '../../../../common/types';
import type { PanelDataArray } from '../../../../common/types/vis_data';
import type { TableSearchRequestMeta } from '../request_processors/table/types';
import type { TableResponseProcessorsParams } from '../response_processors/table/types';

function trendSinceLastBucket(data: PanelDataArray[]) {
  if (data.length < 2) {
    return 0;
  }
  const currentBucket = data[data.length - 1];
  const prevBucket = data[data.length - 2];

  const trend = (Number(currentBucket[1]) - Number(prevBucket[1])) / Number(currentBucket[1]);
  return Number.isNaN(trend) ? 0 : trend;
}

interface ProcessTableBucketParams {
  panel: Panel;
  extractFields: ReturnType<typeof createFieldsFetcher>;
}

export function processBucket({ panel, extractFields }: ProcessTableBucketParams) {
  return async (bucket: Record<string, unknown>) => {
    const resultSeries = await Promise.all(
      getActiveSeries(panel).map(async (series) => {
        const response: TableResponseProcessorsParams['response'] = {
          aggregations: {
            [series.id]: get(bucket, `${series.id}`),
          },
        };
        const meta = (response.aggregations[series.id]?.meta ?? {}) as TableSearchRequestMeta;

        if (meta.normalized && !get(response, `aggregations.${series.id}.timeseries`)) {
          overwrite(response, `aggregations.${series.id}.timeseries`, {
            buckets: get(bucket, `${series.id}.buckets`),
          });
          delete response.aggregations[series.id].buckets;
        }

        const [result] = await buildTableResponse({
          response,
          panel,
          series,
          meta,
          extractFields,
        });

        if (!result) return null;
        const data = result?.data ?? [];
        result.slope = trendSinceLastBucket(data);
        result.last = getLastValue(data);
        return result;
      })
    );

    return { key: bucket.key, series: resultSeries };
  };
}
