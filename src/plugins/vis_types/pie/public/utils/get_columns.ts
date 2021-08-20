/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn, Datatable } from '../../../../expressions/public';
import { BucketColumns, PieVisParams } from '../types';

export const getColumns = (
  visParams: PieVisParams,
  visData: Datatable
): {
  metricColumn: DatatableColumn;
  bucketColumns: Array<Partial<BucketColumns>>;
} => {
  if (visParams.dimensions.buckets && visParams.dimensions.buckets.length > 0) {
    const bucketColumns: Array<Partial<BucketColumns>> = visParams.dimensions.buckets.map(
      ({ accessor, format }) => ({
        ...visData.columns[accessor],
        format,
      })
    );
    const lastBucketId = bucketColumns[bucketColumns.length - 1].id;
    const matchingIndex = visData.columns.findIndex((col) => col.id === lastBucketId);
    return {
      bucketColumns,
      metricColumn: visData.columns[matchingIndex + 1],
    };
  }
  const metricAccessor = visParams?.dimensions?.metric.accessor ?? 0;
  const metricColumn = visData.columns[metricAccessor];
  return {
    metricColumn,
    bucketColumns: [
      {
        name: metricColumn.name,
      },
    ],
  };
};
