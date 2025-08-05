/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TermsIndexPatternColumn } from '@kbn/lens-plugin/public';
import { LensApiTermsOperation } from '../schema/bucket_ops';

// @TODO: move it into the shared values/type package
const DEFAULT_BREAKDOWN_SIZE = 5;

export const getTopValuesColumn = (options: LensApiTermsOperation): TermsIndexPatternColumn => {
  const { fields, size = DEFAULT_BREAKDOWN_SIZE, ...params } = options;
  const [sourceField, ...secondaryFields] = fields ?? [];
  return {
    label: `Top ${size} values of ${sourceField}`,
    dataType: 'string',
    operationType: 'terms',
    scale: 'ordinal',
    sourceField,
    isBucketed: true,
    params: {
      size,
      orderBy: {
        type: 'alphabetical',
        fallback: false,
      },
      orderDirection: 'asc',
      otherBucket: false,
      missingBucket: false,
      parentFormat: {
        id: 'terms',
      },
      include: [],
      exclude: [],
      includeIsRegex: false,
      excludeIsRegex: false,
      secondaryFields,
      ...params,
    },
  };
};

export const fromTopValuesColumn = (column: TermsIndexPatternColumn): LensApiTermsOperation => {
  const { params } = column;
  return {
    operation: 'terms',
    fields: [column.sourceField, ...(column.params.secondaryFields ?? [])],
    size: params.size ?? DEFAULT_BREAKDOWN_SIZE,
  };
};
