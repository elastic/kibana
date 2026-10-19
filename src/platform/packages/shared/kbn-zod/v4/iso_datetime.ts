/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { $ZodISODateTimeParams } from 'zod/v4/core';
import { z } from 'zod/v4';

export type IsoDateTimeOptions = string | $ZodISODateTimeParams;

const resolveIsoDateTimeParams = (
  options?: IsoDateTimeOptions
): $ZodISODateTimeParams | undefined =>
  typeof options === 'string' ? { message: options } : options;

/**
 * ISO-8601 datetime string that accepts minute precision (e.g. `2024-01-01T10:00Z`)
 * as well as seconds and fractional seconds, matching Zod 4.4 behavior after 4.5+ began
 * requiring seconds when a `Z` or numeric offset is present.
 */
export const isoDateTime = (options?: IsoDateTimeOptions): z.ZodString => {
  const resolvedOptions = resolveIsoDateTimeParams(options);
  const minutePrecisionSchema = z.iso.datetime({ ...resolvedOptions, precision: -1 });
  const fullPrecisionSchema = z.iso.datetime(resolvedOptions);

  return z
    .string()
    .superRefine((value, ctx) => {
      const fullPrecisionResult = fullPrecisionSchema.safeParse(value);
      if (fullPrecisionResult.success || minutePrecisionSchema.safeParse(value).success) {
        return;
      }

      const [issue] = fullPrecisionResult.error.issues;
      ctx.addIssue({
        code: 'custom',
        message: issue?.message ?? 'Invalid ISO datetime',
      });
    })
    .meta({ format: 'date-time' });
};
