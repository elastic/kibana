/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Column, DateHistogramColumn, TermsColumn } from './lib/convert';
import { getUniqueBuckets } from './utils';

describe('getUniqueBuckets', () => {
  const bucket2: TermsColumn = {
    columnId: '12',
    dataType: 'string',
    isBucketed: true,
    isSplit: true,
    operationType: 'terms',
    params: {
      exclude: [],
      excludeIsRegex: true,
      include: [],
      includeIsRegex: true,
      orderAgg: {
        columnId: 'some-id-1',
        dataType: 'number',
        isBucketed: true,
        isSplit: false,
        operationType: 'average',
        params: {},
        sourceField: 'bytes',
      },
      orderBy: { columnId: 'some-id-1', type: 'column' },
      orderDirection: 'desc',
      otherBucket: false,
      parentFormat: { id: 'terms' },
      secondaryFields: [],
      size: 10,
    },
    sourceField: 'bytes',
  };

  it('should return unique buckets', () => {
    expect(getUniqueBuckets([bucket2, bucket2])).toEqual([bucket2]);
  });

  it('should ignore columnIds', () => {
    const bucketWithOtherColumnIds = {
      ...bucket2,
      columnId: '22',
      params: {
        ...bucket2.params,
        orderAgg: { ...bucket2.params.orderAgg, columnId: '---1' } as Column,
        orderBy: { ...bucket2.params.orderBy, columnId: '---2' } as {
          type: 'column';
          columnId: string;
        },
      },
    };
    expect(getUniqueBuckets([bucket2, bucketWithOtherColumnIds])).toEqual([bucket2]);
  });

  it('should respect differences of terms', () => {
    const bucketWithOtherColumnIds = {
      ...bucket2,
      columnId: '22',
      params: {
        ...bucket2.params,
        orderAgg: { ...bucket2.params.orderAgg, columnId: '---1' } as Column,
        orderBy: { ...bucket2.params.orderBy, columnId: '---2' } as {
          type: 'column';
          columnId: string;
        },
      },
      sourceField: 'name',
    };
    expect(getUniqueBuckets([bucket2, bucketWithOtherColumnIds])).toEqual([
      bucket2,
      bucketWithOtherColumnIds,
    ]);
  });

  it('should respect differences of other buckets', () => {
    const bucket: DateHistogramColumn = {
      dataType: 'number',
      isBucketed: true,
      isSplit: false,
      operationType: 'date_histogram',
      params: { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
      sourceField: 'field1',
      columnId: '1',
    };
    const bucket1 = {
      ...bucket,
      columnId: '22',
    };
    expect(getUniqueBuckets([bucket, bucket1])).toEqual([bucket]);
    const bucket3 = {
      ...bucket,
      field: 'some-other-field',
    };
    expect(getUniqueBuckets([bucket, bucket3])).toEqual([bucket, bucket3]);
  });
});
