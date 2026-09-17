/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import {
  type DeleteEsqlViewsRequest,
  type EsqlView,
  type EsqlViewMutationResponse,
  type EsqlViewsResult,
  type UpsertEsqlViewRequest,
  getViewRoute,
  VIEWS_BULK_DELETE_ROUTE,
  VIEWS_ROUTE,
} from '@kbn/esql-types';

interface ErrorResponseBody {
  message?: string;
  statusCode?: number;
}

interface HttpFetchError extends Error {
  response?: { status: number };
  body?: ErrorResponseBody;
}

const isHttpFetchError = (error: unknown): error is HttpFetchError =>
  error instanceof Error && 'request' in error;

export class EsqlViewsClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'EsqlViewsClientError';
  }
}

export interface EsqlViewsClient {
  getViews(signal?: AbortSignal): Promise<EsqlViewsResult>;
  getView(name: string, signal?: AbortSignal): Promise<EsqlView>;
  createView(request: UpsertEsqlViewRequest): Promise<EsqlViewMutationResponse>;
  updateView(request: UpsertEsqlViewRequest): Promise<EsqlViewMutationResponse>;
  deleteViews(names: string[]): Promise<EsqlViewMutationResponse>;
}

const normalizeError = (error: unknown): EsqlViewsClientError => {
  if (error instanceof EsqlViewsClientError) {
    return error;
  }

  if (isHttpFetchError(error)) {
    const body = error.body as ErrorResponseBody | undefined;
    return new EsqlViewsClientError(
      body?.message ?? error.message,
      error.response?.status ?? body?.statusCode,
      error
    );
  }

  const originalError = error instanceof Error ? error : new Error(String(error));
  return new EsqlViewsClientError(originalError.message, undefined, originalError);
};

const runRequest = async <Response>(request: () => Promise<Response>): Promise<Response> => {
  try {
    return await request();
  } catch (error) {
    throw normalizeError(error);
  }
};

export const createEsqlViewsClient = (http: HttpStart): EsqlViewsClient => {
  const getViews = (signal?: AbortSignal) =>
    runRequest(() => http.get<EsqlViewsResult>(VIEWS_ROUTE, { signal }));

  const getView = (name: string, signal?: AbortSignal) =>
    runRequest(() => http.get<EsqlView>(getViewRoute(name), { signal }));

  const upsertView = ({ name, query, description }: UpsertEsqlViewRequest) =>
    runRequest(() =>
      http.put<EsqlViewMutationResponse>(getViewRoute(name), {
        body: JSON.stringify({ query, description }),
      })
    );

  const createView = async (request: UpsertEsqlViewRequest): Promise<EsqlViewMutationResponse> => {
    try {
      await getView(request.name);
    } catch (error) {
      const normalizedError = normalizeError(error);
      if (normalizedError.statusCode === 404) {
        return upsertView(request);
      }
      throw normalizedError;
    }

    throw new EsqlViewsClientError(`An ES|QL view named "${request.name}" already exists`, 409);
  };

  const updateView = (request: UpsertEsqlViewRequest) => upsertView(request);

  const deleteViews = (names: string[]): Promise<EsqlViewMutationResponse> => {
    if (names.length === 0) {
      return Promise.reject(
        new EsqlViewsClientError('At least one ES|QL view name is required', 400)
      );
    }

    if (names.length === 1) {
      return runRequest(() => http.delete<EsqlViewMutationResponse>(getViewRoute(names[0])));
    }

    const request: DeleteEsqlViewsRequest = { names };
    return runRequest(() =>
      http.post<EsqlViewMutationResponse>(VIEWS_BULK_DELETE_ROUTE, {
        body: JSON.stringify(request),
      })
    );
  };

  return {
    getViews,
    getView,
    createView,
    updateView,
    deleteViews,
  };
};
