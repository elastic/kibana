/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup, HttpResponse } from '@kbn/core/public';
import type { ProjectRouting } from '@kbn/es-query';
import { DataViewMissingIndices } from '../../common/lib';
import type { GetFieldsOptions, IDataViewsApiClient } from '../../common';
import type { FieldsForWildcardResponse } from '../../common/types';
import { FIELDS_FOR_WILDCARD_PATH, FIELDS_PATH } from '../../common/constants';

const API_BASE_URL: string = `/api/index_patterns/`;
const version = '1';

async function sha1(str: string) {
  if (crypto.subtle) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(hash))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  } else {
    const { sha256 } = await import('./sha256');
    return sha256(str);
  }
}

/**
 * Helper function to get the request body for the getFieldsForWildcard request
 * @param options options for fields request
 * @returns string | undefined
 */
export function getFieldsForWildcardRequestBody(options: GetFieldsOptions): string | undefined {
  const { indexFilter, runtimeMappings, projectRouting } = options;

  if (!indexFilter && !runtimeMappings && !projectRouting) {
    return;
  }

  return JSON.stringify({
    ...(indexFilter && { index_filter: indexFilter }),
    ...(runtimeMappings && { runtime_mappings: runtimeMappings }),
    ...(projectRouting && { project_routing: projectRouting }),
  });
}

/**
 * Data Views API Client - client implementation
 */
export class DataViewsApiClient implements IDataViewsApiClient {
  private http: HttpSetup;
  private getCurrentUserId: () => Promise<string | undefined>;
  private getGlobalProjectRouting?: () => ProjectRouting;

  /**
   * constructor
   * @param http http dependency
   * @param getCurrentUserId function that returns the current user id
   * @param getGlobalProjectRouting function that returns the global project routing, used if override is not provided in the options of a request
   */
  constructor(
    http: HttpSetup,
    getCurrentUserId: () => Promise<string | undefined>,
    getGlobalProjectRouting?: () => ProjectRouting
  ) {
    this.http = http;
    this.getCurrentUserId = getCurrentUserId;
    this.getGlobalProjectRouting = getGlobalProjectRouting;
  }

  private async _request<T = unknown>(
    url: string,
    query?: {},
    body?: string,
    forceRefresh?: boolean,
    abortSignal?: AbortSignal
  ): Promise<HttpResponse<T> | undefined> {
    const asResponse = true;
    const cacheOptions: { cache?: RequestCache } = forceRefresh ? { cache: 'no-cache' } : {};
    const userId = await this.getCurrentUserId();

    const userHash = userId ? await sha1(userId) : '';
    const headers = userHash ? { 'user-hash': userHash } : undefined;

    const request = body
      ? this.http.post<T>(url, { query, body, version, asResponse, signal: abortSignal })
      : this.http.fetch<T>(url, {
          query,
          version,
          ...cacheOptions,
          asResponse,
          headers,
          signal: abortSignal,
        });

    return request.catch((resp) => {
      // Custom errors with a body
      if (resp?.body) {
        if (resp.body.statusCode === 404 && resp.body.attributes?.code === 'no_matching_indices') {
          throw new DataViewMissingIndices(resp.body.message);
        }

        throw new Error(resp.body.message || resp.body.error || `${resp.body.statusCode} Response`);
      }

      // Regular errors including AbortError
      if (typeof resp?.name === 'string' && typeof resp?.message === 'string') {
        throw resp;
      }

      // Other unknown errors
      throw new Error('Unknown error');
    });
  }

  private _getUrl(path: string[]) {
    return API_BASE_URL + path.filter(Boolean).map(encodeURIComponent).join('/');
  }

  /**
   * Get field list for a given index pattern
   * @param options options for fields request
   */
  getFieldsForWildcard(options: GetFieldsOptions) {
    const {
      pattern,
      metaFields,
      type,
      rollupIndex,
      allowNoIndex,
      includeUnmapped,
      fields,
      forceRefresh,
      allowHidden,
      fieldTypes,
      includeEmptyFields,
      abortSignal,
    } = options;
    const projectRouting = options.projectRouting || this.getGlobalProjectRouting?.();
    const body = getFieldsForWildcardRequestBody({ projectRouting, ...options });
    // Use internal path when we have a body (indexFilter, runtimeMappings, or projectRouting)
    const hasBody = Boolean(body);
    const path = hasBody ? FIELDS_FOR_WILDCARD_PATH : FIELDS_PATH;
    const versionQueryParam = hasBody ? {} : { apiVersion: version };

    return this._request<FieldsForWildcardResponse>(
      path,
      {
        pattern,
        meta_fields: metaFields,
        type,
        rollup_index: rollupIndex,
        allow_no_index: allowNoIndex,
        include_unmapped: includeUnmapped,
        fields,
        field_types: fieldTypes,
        // default to undefined to keep value out of URL params and improve caching
        allow_hidden: allowHidden || undefined,
        include_empty_fields: includeEmptyFields,
        ...versionQueryParam,
      },
      body,
      forceRefresh,
      abortSignal
    ).then((response) => {
      return {
        indices: response?.body?.indices || [],
        fields: response?.body?.fields || [],
        etag: response?.response?.headers?.get('etag') || '',
      };
    });
  }

  /**
   * Does a user created data view exist?
   */
  async hasUserDataView(): Promise<boolean> {
    const response = await this._request<{ result: boolean }>(
      this._getUrl(['has_user_index_pattern'])
    );

    return response?.body?.result ?? false;
  }
}
