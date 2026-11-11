/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { EXPLAIN_ERROR_ROUTE, NO_AI_CONNECTOR_ERROR_CODE } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';

export interface EsqlErrorExplanation {
  summary: string;
  suggestions: string[];
  query?: string;
}

interface ExplainErrorResponse {
  summary: string;
  suggestions: string[];
  query: string | null;
}

const MAX_ERROR_LENGTH = 8000;

/** Asks the AI to explain an error for a query. */
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
    throw new ExplainErrorFailure(readErrorMessage(caught), readErrorCode(caught));
  }
}

export class ExplainErrorFailure extends Error {
  readonly isNoConnector: boolean;

  constructor(message: string, code?: string) {
    super(message);
    this.isNoConnector = code === NO_AI_CONNECTOR_ERROR_CODE;
  }
}

function readErrorCode(caught: unknown): string | undefined {
  const code = (caught as { body?: { attributes?: { code?: unknown } } } | undefined)?.body
    ?.attributes?.code;
  return typeof code === 'string' ? code : undefined;
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
