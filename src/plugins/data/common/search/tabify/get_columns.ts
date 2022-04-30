/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groupBy } from 'lodash';
import { IAggConfig } from '../aggs';
import type { TabbedAggColumn } from './types';

const getColumn = (agg: IAggConfig, i: number): TabbedAggColumn => {
  let name = '';
  try {
    name = agg.makeLabel();
  } catch (e) {
    // skip the case when makeLabel throws an error (e.x. no appropriate field for an aggregation)
  }

  return {
    aggConfig: agg,
    id: `col-${i}-${agg.id}`,
    name,
  };
};

/**
 * Builds tabify columns.
 *
 * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
 * @param {boolean} minimalColumns - setting to true will only return a column for the last bucket/metric instead of one for each level
 */
export function tabifyGetColumns(aggs: IAggConfig[], minimalColumns: boolean): TabbedAggColumn[] {
  // pick the columns
  if (minimalColumns) {
    return aggs.map((agg, i) => getColumn(agg, i));
  }

  // supposed to be bucket,...metrics,bucket,...metrics
  const columns: TabbedAggColumn[] = [];

  // separate the metrics
  const grouped = groupBy(aggs, (agg) => {
    return agg.type.type;
  });

  if (!grouped.buckets) {
    // return just the metrics, in column format
    return grouped.metrics.map((agg, i) => getColumn(agg, i));
  }

  let columnIndex = 0;
  // return the buckets, and after each place all of the metrics
  grouped.buckets.forEach((agg) => {
    columns.push(getColumn(agg, columnIndex++));
    grouped.metrics.forEach((metric) => {
      columns.push(getColumn(metric, columnIndex++));
    });
  });

  return columns;
}
