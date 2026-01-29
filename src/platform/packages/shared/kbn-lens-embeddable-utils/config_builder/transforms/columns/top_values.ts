/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TermsIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiTermsOperation } from '../../schema/bucket_ops';
import { fromFormatAPIToLensState } from './format';
import { isColumnOfReferableType } from './utils';
import { getLensAPIBucketSharedProps, getLensStateBucketSharedProps } from './utils';
import type { AnyLensStateColumn } from './types';

function getOrderByValue(
  rankBy: LensApiTermsOperation['rank_by'],
  getMetricColumnIdByIndex: (index: number) => string | undefined
): TermsIndexPatternColumn['params']['orderBy'] {
  if (rankBy?.type === 'rare') {
    return { type: 'rare', maxDocCount: rankBy.max ?? 1000 };
  }
  if (rankBy?.type === 'significant') {
    return { type: 'significant' };
  }
  if (rankBy?.type === 'alphabetical') {
    return { type: 'alphabetical' };
  }
  if (rankBy?.type === 'custom') {
    return { type: 'custom' };
  }

  const refId = getMetricColumnIdByIndex(rankBy?.type === 'column' ? rankBy.metric ?? 0 : 0);
  if (!refId) {
    return { type: 'alphabetical', fallback: true };
  }
  return { type: 'column', columnId: refId };
}

function getOrderDirection(
  rankBy: LensApiTermsOperation['rank_by'],
  getMetricColumnIdByIndex: (index: number) => string | undefined
): TermsIndexPatternColumn['params']['orderDirection'] {
  if (rankBy && 'direction' in rankBy && rankBy.direction) {
    return rankBy.direction;
  }
  const refId = getMetricColumnIdByIndex(rankBy?.type === 'column' ? rankBy.metric ?? 0 : 0);
  return refId ? 'desc' : 'asc';
}

export function fromTermsLensApiToLensState(
  options: LensApiTermsOperation,
  getMetricColumnIdByIndex: (index: number) => string | undefined
): TermsIndexPatternColumn {
  const { fields, size, increase_accuracy, includes, excludes, other_bucket, rank_by } = options;

  const [field, ...secondaryFields] = fields;
  const orderByConfig = getOrderByValue(rank_by, getMetricColumnIdByIndex);
  const orderDirection = getOrderDirection(rank_by, getMetricColumnIdByIndex);

  const format = fromFormatAPIToLensState(options.format);

  return {
    operationType: 'terms',
    dataType: 'string',
    ...getLensStateBucketSharedProps({ ...options, field }),
    params: {
      ...(secondaryFields.length ? { secondaryFields } : {}),
      size, // it cannot be 0 (zero)
      ...(increase_accuracy != null ? { accuracyMode: increase_accuracy } : {}),
      ...(includes?.values
        ? { include: includes?.values, includeIsRegex: includes?.as_regex ?? false }
        : {}),
      ...(excludes?.values
        ? {
            exclude: excludes.values,
            excludeIsRegex: excludes?.as_regex ?? false,
          }
        : {}),
      ...(other_bucket != null ? { otherBucket: true } : {}),
      ...(other_bucket?.include_documents_without_field != null
        ? { missingBucket: other_bucket?.include_documents_without_field }
        : {}),
      orderBy: orderByConfig,
      orderDirection,
      ...(rank_by?.type === 'custom'
        ? {
            orderAgg: {
              operationType: rank_by.operation,
              sourceField: rank_by.field ?? '',
              dataType: 'number',
              isBucketed: false,
              label: '',
            },
          }
        : {}),
      ...(format ? { format } : {}),
      parentFormat: { id: 'terms' },
    },
  };
}

function getRankByConfig(
  params: TermsIndexPatternColumn['params'],
  columns: { column: AnyLensStateColumn; id: string }[]
): LensApiTermsOperation['rank_by'] {
  if (params.orderBy.type === 'alphabetical') {
    return { type: 'alphabetical', direction: params.orderDirection };
  }
  if (params.orderBy.type === 'rare') {
    return { type: 'rare', max: params.orderBy.maxDocCount };
  }
  if (params.orderBy.type === 'significant') {
    return { type: 'significant' };
  }
  if (
    params.orderBy.type === 'custom' &&
    params.orderAgg &&
    // @ts-expect-error
    isColumnOfReferableType(params.orderAgg)
  ) {
    return {
      type: 'custom',
      operation: params.orderAgg.operationType,
      field: params.orderAgg.sourceField,
      direction: params.orderDirection,
    };
  }
  if (params.orderBy.type === 'column') {
    const index = columns
      .filter(({ column }) => !column.isBucketed)
      .findIndex(
        (column) => params.orderBy.type === 'column' && column.id === params.orderBy.columnId!
      );
    if (index > -1) {
      return {
        type: 'column',
        metric: index,
        direction: params.orderDirection,
      };
    }
  }
  return;
}

export function fromTermsLensStateToAPI(
  column: TermsIndexPatternColumn,
  columns: { column: AnyLensStateColumn; id: string }[]
): LensApiTermsOperation {
  const { label } = getLensAPIBucketSharedProps(column);
  return {
    operation: 'terms',
    fields: [column.sourceField].concat(column.params.secondaryFields ?? []),
    ...(label ? { label } : {}),
    size: column.params.size,
    ...(column.params.accuracyMode != null
      ? { increase_accuracy: column.params.accuracyMode }
      : {}),
    ...(column.params.include?.length
      ? {
          includes: {
            as_regex: column.params.includeIsRegex,
            values: column.params.include?.map((value) => String(value)) || [],
          },
        }
      : {}),
    ...(column.params.exclude?.length
      ? {
          excludes: {
            as_regex: column.params.excludeIsRegex,
            values: column.params.exclude?.map((value) => String(value)) || [],
          },
        }
      : {}),
    ...(column.params.otherBucket
      ? {
          other_bucket: {
            include_documents_without_field: Boolean(column.params.missingBucket),
          },
        }
      : {}),
    ...(column.params.orderBy ? { rank_by: getRankByConfig(column.params, columns) } : {}),
  };
}
