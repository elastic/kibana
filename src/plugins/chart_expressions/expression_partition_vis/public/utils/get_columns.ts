/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { getColumnByAccessor, getFormatByAccessor } from '../../../../visualizations/common/utils';
import { DatatableColumn, Datatable } from '../../../../expressions/public';
import { BucketColumns, PartitionVisParams } from '../../common/types';

const getMetricColumn = (
  metricAccessor: ExpressionValueVisDimension | string,
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
    const bucketColumns: Array<Partial<BucketColumns>> = buckets.map((bucket) => {
      const column = getColumnByAccessor(bucket, visData.columns);
      return {
        ...column,
        format: getFormatByAccessor(bucket, visData.columns),
      };
    });

    const lastBucketId = bucketColumns[bucketColumns.length - 1].id;
    const matchingIndex = visData.columns.findIndex((col) => col.id === lastBucketId);

    return {
      bucketColumns,
      metricColumn: getMetricColumn(
        metric ?? { accessor: matchingIndex + 1, type: 'vis_dimension', format: {} },
        visData
      )!,
    };
  }
  const metricColumn = getMetricColumn(
    metric ?? { accessor: 0, type: 'vis_dimension', format: {} },
    visData
  )!;
  return {
    metricColumn,
    bucketColumns: [{ name: metricColumn.name }],
  };
};
