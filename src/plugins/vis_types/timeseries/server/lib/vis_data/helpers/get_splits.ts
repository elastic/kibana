/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Color from 'color';
import { get, isPlainObject } from 'lodash';
import { overwrite } from '../helpers';

import { calculateLabel } from '../../../../common/calculate_label';
import { SERIES_SEPARATOR } from '../../../../common/constants';
import { getLastMetric } from './get_last_metric';
import { formatKey } from './format_key';
import { MultiFieldKey } from '../../../../../../data/common/search/aggs/buckets/multi_field_key';

import type { Panel, Series } from '../../../../common/types';
import type { BaseMeta } from '../request_processors/types';

const getTimeSeries = <TRawResponse = unknown>(resp: TRawResponse, series: Series) =>
  get(resp, `aggregations.timeseries`) || get(resp, `aggregations.${series.id}.timeseries`);

interface SplittedData<TMeta extends BaseMeta = BaseMeta> {
  id: string;
  splitByLabel: string;
  label: string;
  labelFormatted?: string;
  termsSplitValue?: string | MultiFieldKey;
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
    meta = get(resp, `aggregations.${series.id}.meta`);
  }

  const color = new Color(series.color);
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
        bucket.labelFormatted = bucket.key_as_string ? formatKey(bucket.key_as_string, series) : '';
        bucket.color = color.string();
        bucket.meta = meta;
        bucket.termsSplitValue = bucket.key?.length ? new MultiFieldKey(bucket) : bucket.key;
        return bucket;
      });
    }

    if (series.split_mode === 'filters' && isPlainObject(buckets)) {
      return (series.split_filters || []).map((filter) => {
        const bucket = get(resp, `aggregations.${series.id}.buckets.${filter.id}`);
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
      color: color.string(),
      ...mergeObj,
      meta: meta!,
    },
  ];
}
