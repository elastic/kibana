/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DatatableRow } from '../../../../expressions/public';
import { BucketColumns } from '../../common/types';

export interface DistinctSeries {
  allSeries: string[];
  parentSeries: string[];
}

export const getDistinctSeries = (
  rows: DatatableRow[],
  buckets: Array<Partial<BucketColumns>>
): DistinctSeries => {
  const parentBucketId = buckets[0].id;
  const parentSeries: string[] = [];
  const allSeries: string[] = [];
  buckets.forEach(({ id }) => {
    if (!id) return;
    rows.forEach((row) => {
      const name = row[id];
      if (!allSeries.includes(name)) {
        allSeries.push(name);
      }
      if (id === parentBucketId && !parentSeries.includes(row[parentBucketId])) {
        parentSeries.push(row[parentBucketId]);
      }
    });
  });
  return { allSeries, parentSeries };
};
