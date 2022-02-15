/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { DatatableColumn, Datatable } from '../../../../expressions/public';
import { BucketColumns, PartitionVisParams } from '../../common/types';
import { getColumnByAccessor } from './accessor';

const getMetricColumn = (
  metricAccessor: ExpressionValueVisDimension['accessor'],
  visData: Datatable
) => {
  return getColumnByAccessor(metricAccessor, visData.columns);
};

export const getColumns = (
  visParams: PartitionVisParams,
  visData: Datatable
): {
  metricColumn: DatatableColumn;
  bucketColumns: Array<Partial<BucketColumns>>;
} => {
  const { metric, buckets } = visParams.dimensions;
  if (buckets && buckets.length > 0) {
    const bucketColumns: Array<Partial<BucketColumns>> = buckets.map(({ accessor, format }) => ({
      ...getColumnByAccessor(accessor, visData.columns),
      format,
    }));

    const lastBucketId = bucketColumns[bucketColumns.length - 1].id;
    const matchingIndex = visData.columns.findIndex((col) => col.id === lastBucketId);

    return {
      bucketColumns,
      metricColumn: getMetricColumn(metric?.accessor ?? matchingIndex + 1, visData),
    };
  }
  const metricColumn = getMetricColumn(metric?.accessor ?? 0, visData);
  return {
    metricColumn,
    bucketColumns: [{ name: metricColumn.name }],
  };
};
