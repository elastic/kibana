/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TermsIndexPatternColumn } from '@kbn/lens-plugin/public';
import { TopValuesColumnParams } from '../../attribute_builder/utils';

const DEFAULT_BREAKDOWN_SIZE = 10;

export const getTopValuesColumn = ({
  field,
  options,
}: {
  field: string;
  options?: Partial<TopValuesColumnParams>;
}): TermsIndexPatternColumn => {
  const { size = DEFAULT_BREAKDOWN_SIZE, ...params } = options ?? {};
  return {
    label: `Top ${size} values of ${field}`,
    dataType: 'string',
    operationType: 'terms',
    scale: 'ordinal',
    sourceField: field,
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
      ...params,
    },
  };
};
