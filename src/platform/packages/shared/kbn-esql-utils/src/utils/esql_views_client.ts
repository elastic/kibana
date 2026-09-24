/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EsqlDeleteViewResponse,
  EsqlPutViewResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart } from '@kbn/core/public';
import {
  type EsqlView,
  type EsqlViewsResult,
  VIEWS_BULK_DELETE_ROUTE,
  VIEWS_ROUTE,
} from '@kbn/esql-types';

interface ErrorResponseBody {
  attributes?: {
    errorType?: string;
  };
  message?: string;
  statusCode?: number;
}

interface HttpFetchError extends Error {
  response?: { status: number };
  body?: ErrorResponseBody;
}

const isHttpFetchError = (error: unknown): error is HttpFetchError =>
  error instanceof Error && 'request' in error;

export const ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE = 'esql_view_already_exists_exception';

export class EsqlViewsClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errorType?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'EsqlViewsClientError';
  }
}

export interface UpsertEsqlViewRequest {
  name: string;
  query: string;
  description?: string;
}

export interface EsqlViewsClient {
  getViews(signal?: AbortSignal): Promise<EsqlViewsResult>;
  getView(name: string, signal?: AbortSignal): Promise<EsqlView | undefined>;
  createView(request: UpsertEsqlViewRequest): Promise<EsqlPutViewResponse>;
  updateView(request: UpsertEsqlViewRequest): Promise<EsqlPutViewResponse>;
  deleteViews(names: string[]): Promise<EsqlDeleteViewResponse>;
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
      body?.attributes?.errorType,
      error
    );
  }

  const originalError = error instanceof Error ? error : new Error(String(error));
  return new EsqlViewsClientError(originalError.message, undefined, undefined, originalError);
};

const runRequest = async <Response>(request: () => Promise<Response>): Promise<Response> => {
  try {
    return await request();
  } catch (error) {
    throw normalizeError(error);
  }
};

const getViewRoute = (name: string) => `${VIEWS_ROUTE}/${encodeURIComponent(name)}`;

export const createEsqlViewsManagementClient = (http: HttpStart): EsqlViewsClient => {
  const getViews = (signal?: AbortSignal) =>
    runRequest(() =>
      http.get<EsqlViewsResult>(VIEWS_ROUTE, {
        query: { strict: true },
        signal,
      })
    );

  const getView = async (name: string, signal?: AbortSignal): Promise<EsqlView | undefined> => {
    try {
      return await runRequest(() => http.get<EsqlView>(getViewRoute(name), { signal }));
    } catch (error) {
      const normalizedError = normalizeError(error);
      if (normalizedError.statusCode === 404) {
        return undefined;
      }
      throw normalizedError;
    }
  };

  const upsertView = ({ name, query, description }: UpsertEsqlViewRequest) =>
    runRequest(() =>
      http.put<EsqlPutViewResponse>(getViewRoute(name), {
        body: JSON.stringify({ query, description }),
      })
    );

  const createView = async (request: UpsertEsqlViewRequest): Promise<EsqlPutViewResponse> => {
    const existingView = await getView(request.name);
    if (existingView === undefined) {
      return upsertView(request);
    }

    throw new EsqlViewsClientError(
      `An ES|QL view named "${request.name}" already exists`,
      409,
      ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE
    );
  };

  const updateView = (request: UpsertEsqlViewRequest) => upsertView(request);

  const deleteViews = (names: string[]): Promise<EsqlDeleteViewResponse> => {
    if (names.length === 0) {
      return Promise.reject(
        new EsqlViewsClientError('At least one ES|QL view name is required', 400)
      );
    }

    if (names.length === 1) {
      return runRequest(() => http.delete<EsqlDeleteViewResponse>(getViewRoute(names[0])));
    }

    return runRequest(() =>
      http.post<EsqlDeleteViewResponse>(VIEWS_BULK_DELETE_ROUTE, {
        body: JSON.stringify({ names }),
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
