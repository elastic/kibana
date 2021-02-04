/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Color from 'color';
import { calculateLabel } from '../../../../common/calculate_label';
import _ from 'lodash';
import { getLastMetric } from './get_last_metric';
import { getSplitColors } from './get_split_colors';
import { formatKey } from './format_key';

const getTimeSeries = (resp, series) =>
  _.get(resp, `aggregations.timeseries`) || _.get(resp, `aggregations.${series.id}.timeseries`);

export function getSplits(resp, panel, series, meta) {
  if (!meta) {
    meta = _.get(resp, `aggregations.${series.id}.meta`);
  }

  const color = new Color(series.color);
  const metric = getLastMetric(series);
  const buckets = _.get(resp, `aggregations.${series.id}.buckets`);
  if (buckets) {
    if (Array.isArray(buckets)) {
      const size = buckets.length;
      const colors = getSplitColors(series.color, size, series.split_color_mode);
      return buckets.map((bucket) => {
        bucket.id = `${series.id}:${bucket.key}`;
        bucket.label = formatKey(bucket.key, series);
        bucket.labelFormatted = bucket.key_as_string ? formatKey(bucket.key_as_string, series) : '';
        bucket.color = panel.type === 'top_n' ? color.string() : colors.shift();
        bucket.meta = meta;
        return bucket;
      });
    }

    if (series.split_mode === 'filters' && _.isPlainObject(buckets)) {
      return series.split_filters.map((filter) => {
        const bucket = _.get(resp, `aggregations.${series.id}.buckets.${filter.id}`);
        bucket.id = `${series.id}:${filter.id}`;
        bucket.key = filter.id;
        bucket.color = filter.color;
        bucket.label = filter.label || filter.filter.query || '*';
        bucket.meta = meta;
        return bucket;
      });
    }
  }

  const timeseries = getTimeSeries(resp, series);

  const mergeObj = {
    timeseries,
  };
  series.metrics
    .filter((m) => /_bucket/.test(m.type))
    .forEach((m) => {
      mergeObj[m.id] = _.get(resp, `aggregations.${series.id}.${m.id}`);
    });
  return [
    {
      id: series.id,
      label: series.label || calculateLabel(metric, series.metrics),
      color: color.string(),
      ...mergeObj,
      meta,
    },
  ];
}
