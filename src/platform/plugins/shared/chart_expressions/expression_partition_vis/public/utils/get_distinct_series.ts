/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DatatableRow } from '@kbn/expressions-plugin/public';
import { BucketColumns } from '../../common/types';

/**
 * All the available categories of a datatable.
 */
export interface DistinctSeries {
  /**
   * An array of unique category/bucket available on all the categorical/bucket columns.
   * It could be `string` or `RangeKey` but is typed as unknown for now due to the loose nature of the DatatableRow type
   */
  allSeries: unknown[];
  /**
   * An array of unique category/bucket available on the first column of a datatable.
   * It could be `string` or `RangeKey` but is typed as unknown for now due to the loose nature of the DatatableRow type
   */
  parentSeries: unknown[];
}

/**
 * This method returns all the categories available in a datatable.
 * Here, categorical values are described as `bucket`, following the Elasticsearch bucket aggregation naming.
 * It describes as `parentSeries` all the categories available on the `first` available column.
 * It describes as `allSeries` each unique category/bucket available on all the categorical/bucket columns.
 * The output order depends on the original datatable configuration.
 */
export const getDistinctSeries = (
  rows: DatatableRow[],
  bucketColumns: Array<Partial<BucketColumns>>
): DistinctSeries => {
  const parentBucketId = bucketColumns[0].id;
  // using unknown here because there the DatatableRow is just a plain Record<string, any>
  // At least we can prevent some issues, see https://github.com/elastic/kibana/issues/153437
  const parentSeries: Set<unknown> = new Set();
  const allSeries: Set<unknown> = new Set();
  bucketColumns.forEach(({ id }) => {
    if (!id) return;
    rows.forEach((row) => {
      allSeries.add(row[id]);
      if (id === parentBucketId) {
        parentSeries.add(row[parentBucketId]);
      }
    });
  });
  return { allSeries: [...allSeries], parentSeries: [...parentSeries] };
};
