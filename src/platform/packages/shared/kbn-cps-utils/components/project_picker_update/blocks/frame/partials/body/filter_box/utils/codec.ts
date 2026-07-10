/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const filterExpressionPattern = /^(-?)(.*):(.*)$/;

/**
 * filter expression codec declaration for CPS project picker filtering,
 * leverages zod for validation and transforms.
 */
export const filterExpressionCodec = z.codec(
  z.optional(z.string()),
  z.object({
    operator: z.optional(z.string()),
    tagName: z.optional(z.string()),
    tagValue: z.optional(z.string()),
  }),
  {
    decode: (value) => {
      const [operator, tagName, tagValue] = (value ?? '').match(filterExpressionPattern) ?? [];
      return {
        operator,
        tagName,
        tagValue,
      };
    },
    encode: (value) => {
      return `${value.operator}:${value.tagName}:${value.tagValue}`;
    },
  }
);
