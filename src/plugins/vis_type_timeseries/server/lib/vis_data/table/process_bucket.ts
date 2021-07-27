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

import type { Panel } from '../../../../common/types';
import type { TableSearchRequestMeta } from '../request_processors/table/types';
import type { PanelDataArray } from '../../../../common/types/vis_data';
import type { createFieldsFetcher } from '../../search_strategies/lib/fields_fetcher';
import type { createFieldFormatAccessor } from '../create_field_format_accessor';

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
  getFieldFormatByName: ReturnType<typeof createFieldFormatAccessor>;
}

export function processBucket({
  panel,
  extractFields,
  getFieldFormatByName,
}: ProcessTableBucketParams) {
  return async (bucket: Record<string, unknown>) => {
    const resultSeries = await Promise.all(
      getActiveSeries(panel).map(async (series) => {
        const timeseries = get(bucket, `${series.id}.timeseries`);
        const buckets = get(bucket, `${series.id}.buckets`);
        let meta: TableSearchRequestMeta = {};

        if (!timeseries && buckets) {
          meta = get(bucket, `${series.id}.meta`) as TableSearchRequestMeta;

          overwrite(bucket, series.id, {
            meta,
            timeseries: {
              buckets: get(bucket, `${series.id}.buckets`),
            },
          });
        }

        const [result] = await buildTableResponse({
          bucket,
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

    const key =
      getFieldFormatByName && panel.pivot_id
        ? getFieldFormatByName(panel.pivot_id).convert(bucket.key)
        : bucket.key;

    return { key, series: resultSeries };
  };
}
