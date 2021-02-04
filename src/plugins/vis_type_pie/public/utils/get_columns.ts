/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn, Datatable } from '../../../expressions/public';
import { BucketColumns, PieVisParams } from '../types';

export const getColumns = (visParams: PieVisParams, visData: Datatable) => {
  const bucketColumns: Array<Partial<BucketColumns>> = [];
  let metricColumn: DatatableColumn;
  if (visParams?.dimensions?.buckets) {
    visParams.dimensions.buckets.forEach((b) => {
      bucketColumns.push({ ...visData.columns[b.accessor], format: b.format });
    });
    const lastBucketId = bucketColumns[bucketColumns.length - 1].id;
    const matchingIndex = visData.columns.findIndex((col) => col.id === lastBucketId);
    metricColumn = visData.columns[matchingIndex + 1];
  } else {
    metricColumn = visData.columns[0];
    bucketColumns.push({
      name: metricColumn.name,
    });
  }
  return {
    bucketColumns,
    metricColumn,
  };
};
