/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { EXPLAIN_ERROR_ROUTE } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';

export interface EsqlErrorExplanation {
  summary: string;
  suggestions: string[];
  /** A corrected query, only when a change to the query resolves the error. */
  query?: string;
}

interface ExplainErrorResponse {
  summary: string;
  suggestions: string[];
  query: string | null;
}

const MAX_ERROR_LENGTH = 8000;

// Only an available answer is kept. HttpStart outlives a visit to Discover, so a user who sets up a
// connector or a license after seeing an error must not stay stuck on an old "unavailable".
const availability = new WeakMap<object, Promise<boolean>>();

/**
 * Tells whether the action can be used: an AI connector exists and the license allows it. A
 * positive answer is kept per http service, so the server is asked once per page for it.
 */
export function checkErrorExplanationAvailable(http: Pick<HttpStart, 'get'>): Promise<boolean> {
  const known = availability.get(http);
  if (known) {
    return known;
  }

  const request = http
    .get<{ available?: boolean }>(EXPLAIN_ERROR_ROUTE)
    .then((response) => response.available === true)
    .catch(() => false)
    .then((isAvailable) => {
      if (!isAvailable) {
        availability.delete(http);
      }
      return isAvailable;
    });
  availability.set(http, request);
  return request;
}

/** Asks the AI what an error from Elasticsearch means for a query, and what to do about it. */
export async function explainEsqlError({
  http,
  query,
  errorMessage,
  abortSignal,
}: {
  http: Pick<HttpStart, 'post'>;
  query: string;
  errorMessage: string;
  abortSignal: AbortSignal;
}): Promise<EsqlErrorExplanation> {
  try {
    const response = await http.post<ExplainErrorResponse>(EXPLAIN_ERROR_ROUTE, {
      body: JSON.stringify({
        queryString: query,
        errorMessage: errorMessage.slice(0, MAX_ERROR_LENGTH),
      }),
      signal: abortSignal,
    });
    return {
      summary: response.summary,
      suggestions: response.suggestions,
      query: response.query ?? undefined,
    };
  } catch (caught: unknown) {
    throw new Error(readErrorMessage(caught));
  }
}

function readErrorMessage(caught: unknown): string {
  const body = (caught as { body?: { message?: unknown } } | undefined)?.body;
  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  return caught instanceof Error && caught.message
    ? caught.message
    : i18n.translate('discover.esqlErrorHelp.failedMessage', {
        defaultMessage: 'The AI could not explain this error.',
      });
}
