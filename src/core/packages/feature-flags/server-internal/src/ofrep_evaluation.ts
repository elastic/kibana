/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';

/**
 * Browser OFREP base path. The web provider appends `ofrep/v1/evaluate/flags`.
 * Keep this aligned with {@link OFREP_BULK_PATH}.
 */
export const OFREP_PROVIDER_BASE_PATH = '/internal/feature-flags/';

export const OFREP_BULK_PATH = '/internal/feature-flags/ofrep/v1/evaluate/flags';
export const OFREP_SINGLE_PATH = '/internal/feature-flags/ofrep/v1/evaluate/flags/{flagKey}';

export interface OfrepEvaluation {
  key: string;
  value: unknown;
  reason: 'CACHED';
  variant: string;
  metadata: Record<string, never>;
}

export interface OfrepBulkResponse {
  flags: OfrepEvaluation[];
  metadata: Record<string, never>;
}

export interface OfrepErrorBody {
  key?: string;
  errorCode: 'FLAG_NOT_FOUND' | 'GENERAL';
  errorDetails: string;
}

/** Shapes the server's flag snapshot as OFREP evaluations, in a stable key order. */
export function toOfrepEvaluations(flags: Record<string, unknown>): OfrepEvaluation[] {
  return Object.keys(flags)
    .filter((key) => flags[key] !== undefined)
    .sort()
    .map((key) => {
      const value = flags[key];
      return {
        key,
        value,
        reason: 'CACHED',
        variant: typeof value === 'string' ? value : JSON.stringify(value),
        metadata: {},
      };
    });
}

/** Builds the bulk OFREP response for one server-side snapshot. */
export function toBulkResponse(flags: Record<string, unknown>): OfrepBulkResponse {
  return {
    flags: toOfrepEvaluations(flags),
    metadata: {},
  };
}

/** Returns a strong ETag for an OFREP JSON body. */
export function entityTag(payload: unknown): string {
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return `"${hash}"`;
}

/** True when `If-None-Match` contains this response's ETag. */
export function ifNoneMatchSatisfied(header: string | string[] | undefined, etag: string): boolean {
  if (header === undefined) {
    return false;
  }

  const raw = Array.isArray(header) ? header.join(',') : header;
  return raw.split(',').some((part) => {
    const value = part.trim().replace(/^W\//, '');
    return value === '*' || value === etag;
  });
}
