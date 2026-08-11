/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import { getReporter } from './violation_reporter';

// ---------------------------------------------------------------------------
// Helper factory — attaches .warn() to a ZodString schema
// ---------------------------------------------------------------------------

function makeZodHelper(name: string, params: { min?: number; max: number }) {
  const { min, max } = params;

  const full = min !== undefined ? z.string().min(min).max(max) : z.string().max(max);

  const warn = ({ label }: { label?: string } = {}) => {
    const s = min !== undefined ? z.string().min(min) : z.string();

    return s.superRefine((value: string) => {
      if (value.length > max) {
        getReporter().report({ helper: name, length: value.length, maxLength: max, label });
      }
    });
  };

  return Object.assign(full, { warn });
}

// ---------------------------------------------------------------------------
// Pre-built Zod string schemas
// ---------------------------------------------------------------------------

export const savedObjectIdSchema = makeZodHelper('savedObjectId', { min: 1, max: 512 });
export const spaceIdSchema = makeZodHelper('spaceId', { min: 1, max: 512 });
export const displayNameSchema = makeZodHelper('displayName', { min: 1, max: 1024 });
export const descriptionSchema = makeZodHelper('description', { max: 10000 });
export const searchFilterSchema = makeZodHelper('searchFilter', { max: 10000 });
export const aggregationSchema = makeZodHelper('aggregation', { max: 100000 });

// ---------------------------------------------------------------------------
// Unbounded string escape hatch
// `reason` is required and visible at the call site for CodeQL suppression.
// It is intentionally not stored at runtime — Zod v4's .meta() uses a global
// side-effectful registry that does not survive schema composition.
// ---------------------------------------------------------------------------

export function unboundedString(reason: string): z.ZodString {
  if (!reason || reason.trim() === '') {
    throw new Error(
      'unboundedString() requires a non-empty reason explaining why no max length is set'
    );
  }
  return z.string();
}

// ---------------------------------------------------------------------------
// Deduplicated array helper
// ---------------------------------------------------------------------------

export function deduplicatedArrayOf<T>(item: z.ZodType<T>) {
  return z.array(item).transform((arr) => [...new Set(arr)] as T[]);
}
