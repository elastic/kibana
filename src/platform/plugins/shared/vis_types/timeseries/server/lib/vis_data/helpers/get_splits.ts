/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get, isPlainObject } from 'lodash';
import { getValidColor } from '@kbn/coloring';
import { overwrite } from '.';

import { calculateLabel } from '../../../../common/calculate_label';
import { SERIES_SEPARATOR } from '../../../../common/constants';
import { getLastMetric } from './get_last_metric';
import { formatKey } from './format_key';

import type { Panel, Series } from '../../../../common/types';
import type { BaseMeta } from '../request_processors/types';

const getTimeSeries = <TRawResponse = unknown>(resp: TRawResponse, series: Series) =>
  get(resp, `aggregations.timeseries`) || get(resp, [`aggregations`, series.id, `timeseries`]);

interface SplittedData<TMeta extends BaseMeta = BaseMeta> {
  id: string;
  splitByLabel: string;
  label: string;
  termsSplitKey?: string | string[];
  color: string;
  meta: TMeta;
  timeseries: {
    buckets: [
      {
        [s: string]: {
          // should be typed
          values: Record<string, unknown>;
        };
      } & { key: string | number }
    ];
  };
}

export async function getSplits<TRawResponse = unknown, TMeta extends BaseMeta = BaseMeta>(
  resp: TRawResponse,
  panel: Panel,
  series: Series,
  meta: TMeta | undefined,
  extractFields: Function
): Promise<Array<SplittedData<TMeta>>> {
  if (!meta) {
    meta = get(resp, `aggregations.${series.id}.meta`) as TMeta | undefined;
  }

  // FIXME: the series.color could be undefined even if it is typed as required. This happen due to
  // a partially implemented Mock of Series and Panel in the process_bucket.test.ts
  const color = getValidColor(series.color, { shouldBeCompatibleWithColorJs: true }).hex();
  const metric = getLastMetric(series);
  const buckets = get(resp, `aggregations.${series.id}.buckets`);

  const fieldsForSeries = meta?.dataViewId ? await extractFields({ id: meta.dataViewId }) : [];
  const splitByLabel = calculateLabel(metric, series.metrics, fieldsForSeries);

  if (buckets) {
    if (Array.isArray(buckets)) {
      return buckets.map((bucket) => {
        if (bucket.column_filter) {
          bucket = {
            ...bucket,
            ...bucket.column_filter,
          };
        }

        bucket.id = `${series.id}${SERIES_SEPARATOR}${bucket.key}`;
        bucket.splitByLabel = splitByLabel;
        bucket.label = formatKey(bucket.key, series);
        bucket.color = color;
        bucket.meta = meta;
        bucket.termsSplitKey = bucket.key;
        return bucket;
      });
    }

    if (series.split_mode === 'filters' && isPlainObject(buckets)) {
      return (series.split_filters || []).map((filter) => {
        const bucket = get(resp, [`aggregations`, series.id, `buckets`, filter.id!]); // using array path because the dotted string failed to resolve the types
        bucket.id = `${series.id}${SERIES_SEPARATOR}${filter.id}`;
        bucket.key = filter.id;
        bucket.splitByLabel = splitByLabel;
        bucket.color = filter.color;
        bucket.label = (filter.label || filter.filter?.query) ?? '*';
        bucket.meta = meta;
        return bucket;
      });
    }
  }

  const timeseries: SplittedData<TMeta>['timeseries'] = getTimeSeries<TRawResponse>(resp, series);

  const mergeObj = {
    timeseries,
  };

  series.metrics
    .filter((m) => /_bucket/.test(m.type))
    .forEach((m) => {
      overwrite(mergeObj, m.id, get(resp, `aggregations.${series.id}.${m.id}`));
    });

  return [
    {
      id: series.id,
      splitByLabel,
      label: series.label || splitByLabel,
      color,
      ...mergeObj,
      meta: meta!,
    },
  ];
}
