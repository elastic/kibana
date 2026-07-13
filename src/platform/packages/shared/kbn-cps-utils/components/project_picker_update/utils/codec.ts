/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const filterExpressionPattern = /^(.*):(_.*):(.*)$/;

export const FilterOperator = {
  EQUALS: 'is',
  NOT_EQUALS: 'not',
} as const;

export type FilterOperatorLiteral = (typeof FilterOperator)[keyof typeof FilterOperator];

/**
 * filter expression codec declaration for CPS project picker filtering,
 * leverages zod for validation and transforms.
 */
export const filterExpressionCodec = z.codec(
  z.optional(z.string()),
  z.object({
    operator: z.optional(z.enum(FilterOperator)),
    tagName: z.optional(z.string()),
    tagValue: z.optional(z.string()),
  }),
  {
    decode: (value) => {
      const [, operatorLiteral, tagName, tagValue] =
        (value ?? '').match(filterExpressionPattern) ?? [];

      let operatorValue: FilterOperatorLiteral | undefined;

      switch (operatorLiteral) {
        case FilterOperator.EQUALS:
          operatorValue = FilterOperator.EQUALS;
          break;
        case FilterOperator.NOT_EQUALS:
          operatorValue = FilterOperator.NOT_EQUALS;
          break;
        default:
          break;
      }

      if (operatorLiteral && !operatorValue) {
        throw new Error('Invalid filter expression');
      }

      return {
        operator: operatorValue,
        tagName,
        tagValue,
      };
    },
    encode: (value) => {
      return `${value.operator}:${value.tagName}:${value.tagValue}`;
    },
  }
);
