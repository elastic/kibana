/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

export type EsqlResponseErrorCause = Partial<estypes.ErrorCause>;

const formatSingleCause = (cause: EsqlResponseErrorCause): string | undefined => {
  const formatted = [cause.type, cause.reason]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(': ');
  return formatted || undefined;
};

const formatRootCauses = (rootCauses: EsqlResponseErrorCause[] | undefined): string | undefined => {
  if (!rootCauses?.length) {
    return undefined;
  }

  const formatted = rootCauses
    .map((cause) => formatSingleCause(cause))
    .filter((value): value is string => Boolean(value));

  return formatted.length > 0 ? formatted.join('\n') : undefined;
};

/**
 * Builds a human-readable message from an Elasticsearch error cause, including
 * all `root_cause` entries (e.g. CCS / multi-cluster failures).
 */
export const formatErrorCause = (errorCause: EsqlResponseErrorCause): string => {
  const head = formatSingleCause(errorCause);
  if (head) {
    return head;
  }

  const fromRootCauses = formatRootCauses(errorCause.root_cause);
  if (fromRootCauses) {
    return fromRootCauses;
  }

  const fromCausedBy = errorCause.caused_by ? formatSingleCause(errorCause.caused_by) : undefined;
  return fromCausedBy || 'Elasticsearch returned an error';
};

export interface EsqlEmbeddedError {
  readonly cause: EsqlResponseErrorCause;
  readonly status?: number;
}

/**
 * When Elasticsearch returns a body like `{ error: { type, reason }, status: 400 }`,
 * returns the error cause and optional status from the payload.
 */
export const extractEsqlEmbeddedError = (response: object): EsqlEmbeddedError | undefined => {
  if (!('error' in response) || response.error == null || typeof response.error !== 'object') {
    return undefined;
  }

  const body = response as { status?: unknown };
  const status =
    typeof body.status === 'number' && Number.isFinite(body.status) ? body.status : undefined;

  return { cause: response.error as EsqlResponseErrorCause, status };
};

export class EsqlResponseError extends Error {
  public readonly type?: string;
  public readonly reason?: string;
  public readonly rootCause?: EsqlResponseErrorCause[];
  public readonly status?: number;

  constructor(errorCause: EsqlResponseErrorCause, options?: { status?: number }) {
    super(formatErrorCause(errorCause));
    this.name = 'EsqlResponseError';
    this.type = errorCause.type;
    this.reason = errorCause.reason ?? undefined;
    this.rootCause = errorCause.root_cause;
    this.status = options?.status;

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, EsqlResponseError.prototype);
  }
}

export const isEsqlResponseError = (error: unknown): error is EsqlResponseError =>
  error instanceof EsqlResponseError;
