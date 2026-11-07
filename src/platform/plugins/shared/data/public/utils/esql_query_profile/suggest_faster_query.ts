/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { OPTIMIZE_QUERY_ROUTE } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { QueryProfileView } from './aggregate_esql_profile';
import { buildProfileContext } from './profile_prompt_context';

export interface FasterQuerySuggestion {
  /** A rewritten query, or undefined when the AI found no safe improvement. */
  query?: string;
  reason: string;
}

const availability = new WeakMap<object, Promise<boolean>>();

/**
 * Tells whether an AI connector is available, so the action can be hidden when it is not.
 * The answer is kept per http service, so the server is asked once per page.
 */
export function checkFasterQueryAvailable(http: Pick<HttpStart, 'get'>): Promise<boolean> {
  const known = availability.get(http);
  if (known) {
    return known;
  }

  const request = http
    .get<{ available?: boolean }>(OPTIMIZE_QUERY_ROUTE)
    .then((response) => response.available === true)
    .catch(() => false);
  availability.set(http, request);
  return request;
}

interface OptimizeQueryResponse {
  query: string | null;
  reason: string;
}

/** Asks the AI for a faster query that should return the same results as the profiled one. */
export async function suggestFasterQuery({
  http,
  query,
  view,
  abortSignal,
}: {
  http: Pick<HttpStart, 'post'>;
  query: string;
  view: QueryProfileView;
  abortSignal: AbortSignal;
}): Promise<FasterQuerySuggestion> {
  try {
    const response = await http.post<OptimizeQueryResponse>(OPTIMIZE_QUERY_ROUTE, {
      body: JSON.stringify({ queryString: query, profileContext: buildProfileContext(view) }),
      signal: abortSignal,
    });
    return { query: response.query ?? undefined, reason: response.reason };
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
    : i18n.translate('data.inspector.queryProfile.suggestFailedMessage', {
        defaultMessage: 'The AI could not suggest a faster query.',
      });
}
