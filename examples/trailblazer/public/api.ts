/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart, IHttpFetchError } from '@kbn/core/public';
import type {
  FieldStatsRequestBody,
  FieldStatsResponse,
  FieldsResponse,
  IndicesResponse,
  SearchRequestBody,
  SearchResponseBody,
} from '../common';
import {
  FIELD_STATS_ROUTE,
  FIELDS_ROUTE,
  INDICES_ROUTE,
  SAVED_OBJECT_ROUTE,
  SAVED_OBJECT_TYPES_ROUTE,
  SAVED_OBJECTS_ROUTE,
  SEARCH_ROUTE,
} from '../common';
import type {
  SavedObjectDetailResponse,
  SavedObjectsResponse,
  SavedObjectTarget,
  SavedObjectTypesResponse,
} from '../common/saved_objects';

export class TrailblazerApi {
  constructor(private readonly http: HttpStart) {}

  public getIndices(pattern: string, includeHidden: boolean, signal: AbortSignal) {
    return this.http.get<IndicesResponse>(INDICES_ROUTE, {
      query: { pattern, includeHidden },
      signal,
    });
  }

  public getFields(index: string, includeHidden: boolean, signal: AbortSignal) {
    return this.http.get<FieldsResponse>(FIELDS_ROUTE, {
      query: { index, includeHidden },
      signal,
    });
  }

  public search(body: SearchRequestBody, signal: AbortSignal) {
    return this.http.post<SearchResponseBody>(SEARCH_ROUTE, { body: JSON.stringify(body), signal });
  }

  public fieldStats(body: FieldStatsRequestBody, signal: AbortSignal) {
    return this.http.post<FieldStatsResponse>(FIELD_STATS_ROUTE, {
      body: JSON.stringify(body),
      signal,
    });
  }

  public getSavedObjectTypes(signal: AbortSignal) {
    return this.http.get<SavedObjectTypesResponse>(SAVED_OBJECT_TYPES_ROUTE, { signal });
  }

  public getSavedObjects(type: string, search: string, page: number, signal: AbortSignal) {
    return this.http.get<SavedObjectsResponse>(SAVED_OBJECTS_ROUTE, {
      query: { type, page, ...(search ? { search } : {}) },
      signal,
    });
  }

  public getSavedObject({ type, id, space }: SavedObjectTarget, signal: AbortSignal) {
    return this.http.get<SavedObjectDetailResponse>(SAVED_OBJECT_ROUTE, {
      query: { type, id, ...(space ? { space } : {}) },
      signal,
    });
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Extracts a user-facing message from an HTTP fetch error or any other thrown value. */
export function getErrorMessage(error: unknown): string {
  if (isFetchError(error)) return error.body?.message ?? error.message;
  return error instanceof Error ? error.message : String(error);
}

function isFetchError(error: unknown): error is IHttpFetchError<{ message?: string }> {
  return error instanceof Error && 'body' in error;
}
