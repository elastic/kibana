/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';

export type IsoDateTimeOptions = string | { offset?: boolean; message?: string };

// Zod 4.4.3 `datetime()` with `local` removed. Zod 4.5+ requires seconds whenever `Z` or an offset is present.
const DATE_SOURCE =
  '(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))';
const TIME_SOURCE = '(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?';
const OFFSET_SOURCE = '[+-](?:[01]\\d|2[0-3]):[0-5]\\d';

const ISO_DATETIME_MAX_LENGTH = 64;

const ISO_DATETIME_UTC_REGEX = new RegExp(`^${DATE_SOURCE}T${TIME_SOURCE}Z$`);
const ISO_DATETIME_OFFSET_REGEX = new RegExp(
  `^${DATE_SOURCE}T${TIME_SOURCE}(?:Z|${OFFSET_SOURCE})$`
);

/**
 * ISO-8601 datetime string. Seconds and fractional seconds are optional.
 * A `Z` suffix is required unless `offset` is true, which also allows a numeric offset.
 */
export const isoDateTime = (options?: IsoDateTimeOptions): z.ZodString => {
  const { offset = false, message } =
    typeof options === 'string' ? { message: options } : options ?? {};
  const regex = offset ? ISO_DATETIME_OFFSET_REGEX : ISO_DATETIME_UTC_REGEX;
  const errorMessage = message ?? 'Invalid ISO datetime';

  return (
    z
      .string()
      .max(ISO_DATETIME_MAX_LENGTH, { abort: true, message: errorMessage })
      .refine((value) => regex.test(value), { message: errorMessage })
      // `pattern` lets the workflow YAML editor flag invalid datetimes; the OAS converter strips it.
      .meta({ format: 'date-time', pattern: regex.source })
  );
};
