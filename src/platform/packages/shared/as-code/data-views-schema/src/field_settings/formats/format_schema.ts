/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { booleanFormatSchema } from './boolean';
import { colorFormatSchema } from './color';
import { staticLookupFormatSchema } from './static_lookup';
import { stringFormatSchema } from './string';
import { truncateFormatSchema } from './truncate';
import { urlFormatSchema } from './url';
import { bytesFormatSchema } from './bytes';
import { currencyFormatSchema } from './currency';
import { dateNanosFormatSchema } from './date_nanos';
import { dateFormatSchema } from './date';
import { durationFormatSchema } from './duration';
import { geoPointFormatSchema } from './geo_point';
import { histogramFormatSchema } from './histogram';
import { ipFormatSchema } from './ip';
import { numberFormatSchema } from './number';
import { percentFormatSchema } from './percent';
import { relativeDateFormatSchema } from './relative_date';

const knownFormatSchemas = {
  boolean: booleanFormatSchema,
  bytes: bytesFormatSchema,
  color: colorFormatSchema,
  currency: currencyFormatSchema,
  date_nanos: dateNanosFormatSchema,
  date: dateFormatSchema,
  duration: durationFormatSchema,
  geo_point: geoPointFormatSchema,
  histogram: histogramFormatSchema,
  ip: ipFormatSchema,
  number: numberFormatSchema,
  percent: percentFormatSchema,
  relative_date: relativeDateFormatSchema,
  static_lookup: staticLookupFormatSchema,
  string: stringFormatSchema,
  truncate: truncateFormatSchema,
  url: urlFormatSchema,
} as const;

const extensibleFormatSchema = z.object({ type: z.string(), params: z.any().optional() }).meta({
  title: 'Extensible format',
  description:
    'Fallback for custom formatter IDs only. Known formatter IDs must match their dedicated schema and are validated at runtime.',
});

export const formatSchema = z
  .union([
    booleanFormatSchema,
    bytesFormatSchema,
    colorFormatSchema,
    currencyFormatSchema,
    dateNanosFormatSchema,
    dateFormatSchema,
    durationFormatSchema,
    geoPointFormatSchema,
    histogramFormatSchema,
    ipFormatSchema,
    numberFormatSchema,
    percentFormatSchema,
    relativeDateFormatSchema,
    staticLookupFormatSchema,
    stringFormatSchema,
    truncateFormatSchema,
    urlFormatSchema,
    // Fallback so we do not break extensibility
    extensibleFormatSchema,
  ])
  .superRefine((value, ctx) => {
    const schema = knownFormatSchemas[value.type as keyof typeof knownFormatSchemas];
    if (!schema) {
      return;
    }

    const result = schema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: issue.path,
          message: issue.message,
        });
      }
    }
  })
  .meta({
    id: 'kbn-field-format',
    title: 'Format',
    description:
      'Set your preferred format for displaying the value. Changing the format can affect the value and prevent highlighting in Discover.',
  });
