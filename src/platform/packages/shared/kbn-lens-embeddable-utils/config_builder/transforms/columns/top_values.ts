/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TermsIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiTermsOperation } from '../../schema/bucket_ops';
import { LENS_TERMS_MISSING_BUCKET_DEFAULT, LENS_TERMS_SIZE_DEFAULT } from '../../schema/constants';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';
import { fromFormatAPIToLensState } from './format';
import { isColumnOfReferableType } from './utils';

function ofName(field: string, size: number): string {
  return `Top ${size} values for ${field}`;
}

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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { fields, size, increase_accuracy, includes, excludes, other_bucket, rank_by, label } =
    options;

  const [field, ...secondaryFields] = fields;
  const orderByConfig = getOrderByValue(rank_by, getMetricColumnIdByIndex);
  const orderDirection = getOrderDirection(rank_by, getMetricColumnIdByIndex);

  return {
    operationType: 'terms',
    sourceField: field,
    customLabel: label != null,
    label: label ?? ofName(field, size),
    isBucketed: true,
    dataType: 'string',
    params: {
      secondaryFields,
      size: size || LENS_TERMS_SIZE_DEFAULT, // it cannot be 0 (zero)
      accuracyMode: Boolean(increase_accuracy),
      include: includes?.values ?? [],
      includeIsRegex: includes?.as_regex ?? false,
      exclude: excludes?.values ?? [],
      excludeIsRegex: excludes?.as_regex ?? false,
      otherBucket: Boolean(other_bucket),
      missingBucket:
        other_bucket?.include_documents_without_field ?? LENS_TERMS_MISSING_BUCKET_DEFAULT,
      orderBy: orderByConfig,
      orderDirection,
      orderAgg:
        rank_by?.type === 'custom'
          ? {
              operationType: rank_by.operation,
              sourceField: rank_by.field ?? '',
              dataType: 'number',
              isBucketed: false,
              label: '',
            }
          : undefined,
      format: fromFormatAPIToLensState(options.format),
      parentFormat: { id: 'terms' },
    },
  };
}

function getRankByConfig(
  params: TermsIndexPatternColumn['params'],
  columns: (LensApiAllMetricOperations & { id: string })[]
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
    const index = columns.findIndex(
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
  columns: (LensApiAllMetricOperations & { id: string })[]
): LensApiTermsOperation {
  return {
    operation: 'terms',
    fields: [column.sourceField].concat(column.params.secondaryFields ?? []),
    ...(column.label !== column.sourceField ? { label: column.label } : {}),
    size: column.params.size,
    ...(column.params.accuracyMode == null
      ? { increase_accuracy: column.params.accuracyMode }
      : {}),
    ...(column.params.include
      ? {
          includes: {
            as_regex: column.params.includeIsRegex,
            values: column.params.include?.map((value) => String(value)) || [],
          },
        }
      : {}),
    ...(column.params.exclude
      ? {
          excludes: {
            as_regex: column.params.excludeIsRegex,
            values: column.params.exclude?.map((value) => String(value)) || [],
          },
        }
      : {}),
    ...(column.params.otherBucket != null
      ? {
          other_bucket: {
            include_documents_without_field: Boolean(column.params.missingBucket),
          },
        }
      : {}),
    ...(column.params.orderBy ? { rank_by: getRankByConfig(column.params, columns) } : {}),
  };
}
