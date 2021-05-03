/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import dateMath from '@elastic/datemath';
import { IAggConfigs, TimeRangeBounds } from '../../../../../data/common';
import { DataPublicPluginStart, search } from '../../../../../data/public';

export function getDimensions(aggs: IAggConfigs, data: DataPublicPluginStart) {
  const [metric, agg] = aggs.aggs;
  const { from, to } = data.query.timefilter.timefilter.getTime();
  agg.params.timeRange = {
    from: dateMath.parse(from),
    to: dateMath.parse(to, { roundUp: true }),
  };
  const bounds = agg.params.timeRange
    ? data.query.timefilter.timefilter.calculateBounds(agg.params.timeRange)
    : null;
  const buckets = search.aggs.isDateHistogramBucketAggConfig(agg) ? agg.buckets : undefined;

  if (!buckets) {
    return;
  }

  buckets.setBounds(bounds as TimeRangeBounds);

  const { esUnit, esValue } = buckets.getInterval();
  return {
    x: {
      accessor: 0,
      label: agg.makeLabel(),
      format: agg.toSerializedFieldFormat(),
      params: {
        date: true,
        interval: moment.duration(esValue, esUnit),
        intervalESValue: esValue,
        intervalESUnit: esUnit,
        format: buckets.getScaledDateFormat(),
        bounds: buckets.getBounds(),
      },
    },
    y: {
      accessor: 1,
      format: metric.toSerializedFieldFormat(),
      label: metric.makeLabel(),
    },
  };
}
