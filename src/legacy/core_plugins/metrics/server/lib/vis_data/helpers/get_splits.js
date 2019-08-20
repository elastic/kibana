/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      return buckets.map(bucket => {
        bucket.id = `${series.id}:${bucket.key}`;
        bucket.label = formatKey(bucket.key, series);
        bucket.color = panel.type === 'top_n' ? color.string() : colors.shift();
        bucket.meta = meta;
        return bucket;
      });
    }

    if (series.split_mode === 'filters' && _.isPlainObject(buckets)) {
      return series.split_filters.map(filter => {
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
    .filter(m => /_bucket/.test(m.type))
    .forEach(m => {
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
