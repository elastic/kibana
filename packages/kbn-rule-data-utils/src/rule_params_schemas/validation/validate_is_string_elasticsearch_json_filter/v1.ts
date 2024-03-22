/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { NEVER, RefinementCtx, ZodIssueCode } from 'zod';

export const validateIsStringElasticsearchJSONFilter = (
  value: string,
  zodRefinementCtx: RefinementCtx,
) => {
  if (value === '') {
    // Allow clearing the filter.
    return;
  }

  const message = 'filterQuery must be a valid Elasticsearch filter expressed in JSON';
  try {
    const parsedValue = JSON.parse(value);
    if (!isEmpty(parsedValue.bool)) {
      return;
    }
    zodRefinementCtx.addIssue({
      code: ZodIssueCode.custom,
      message,
      fatal: true,
    });
    return NEVER;
  } catch (e) {
    zodRefinementCtx.addIssue({
      code: ZodIssueCode.custom,
      message,
      fatal: true,
    });
    return NEVER;
  }
};
