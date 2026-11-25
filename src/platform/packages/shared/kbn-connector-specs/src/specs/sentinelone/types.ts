/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/** SentinelOne object ids are numeric strings; letters, digits, '-' and '_' are accepted, never ',' (lists are sent comma-separated). */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const FILTER_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
export const ISO_DATE_HINT = 'ISO 8601, for example 2026-01-31T00:00:00Z';

export const idString = (maxLength: number) => z.string().min(1).max(maxLength).regex(ID_PATTERN);

const filterValue = () =>
  z.union([
    z.string().max(1024),
    z.number(),
    z.boolean(),
    z.array(z.string().min(1).max(1024)).max(1000),
  ]);

export const additionalFilters = (description: string) =>
  z
    .record(z.string().min(1).max(64).regex(FILTER_KEY_PATTERN), filterValue())
    .refine((value) => Object.keys(value).length <= 50, {
      message: 'additionalFilters accepts at most 50 keys',
    })
    .optional()
    .describe(description);
