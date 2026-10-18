/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

/** Public sort field names. A leading `-` on the query value means descending. */
export const AS_CODE_SORT_FIELD_NAMES = ['meta.updated_at', 'meta.created_at'] as const;

export type AsCodeSortFieldName = (typeof AS_CODE_SORT_FIELD_NAMES)[number];

const SORT_FIELD_LIST = AS_CODE_SORT_FIELD_NAMES.join(' or ');

const isSortFieldName = (value: string): value is AsCodeSortFieldName =>
  (AS_CODE_SORT_FIELD_NAMES as readonly string[]).includes(value);

/**
 * `sort` query parameter. One field only; prefix with `-` for descending order.
 * Several comma-separated fields are rejected until list endpoints accept them.
 */
export const asCodeSortQuerySchema = z
  .string()
  .max(128)
  .trim()
  .superRefine((value, ctx) => {
    const parts = value.split(',').map((part) => part.trim());
    if (parts.length !== 1 || parts[0].length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: `sort accepts one field: ${SORT_FIELD_LIST}. Prefix it with - for descending order.`,
      });
      return;
    }

    const name = parts[0].startsWith('-') ? parts[0].slice(1) : parts[0];
    if (!isSortFieldName(name)) {
      ctx.addIssue({
        code: 'custom',
        message: `sort must be ${SORT_FIELD_LIST}. Prefix it with - for descending order.`,
      });
    }
  })
  .optional()
  .meta({
    description:
      'Sort by one field: `meta.updated_at` or `meta.created_at`. Prefix the field with `-` for descending order, for example `-meta.updated_at`. When omitted, a listing is newest first and a text search stays in relevance order. Saved objects without `created_at` sort last.',
  });
