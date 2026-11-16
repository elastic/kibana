/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { OptimizeQueryResponse } from '@kbn/esql-types';
import { OPTIMIZE_QUERY_ROUTE } from '@kbn/esql-types';
import { isNoAiConnectorError } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { QueryProfileView } from './types';
import { buildProfileContext } from './profile_prompt_context';
import { readErrorMessage } from './read_error_message';

export interface FasterQuerySuggestion {
  /** A rewritten query, or undefined when the AI found no safe improvement. */
  query?: string;
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
    throw new SuggestFasterQueryFailure(readFailureMessage(caught), isNoAiConnectorError(caught));
  }
}

export class SuggestFasterQueryFailure extends Error {
  constructor(message: string, public readonly isNoConnector: boolean) {
    super(message);
  }
}

/** The message the server sent with a failed request, or the one of the error itself. */
function readFailureMessage(caught: unknown): string {
  const body = (caught as { body?: { message?: unknown } } | undefined)?.body;
  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  return readErrorMessage(
    caught,
    i18n.translate('data.inspector.queryProfile.suggestFailedMessage', {
      defaultMessage: 'The AI could not suggest a faster query.',
    })
  );
}
