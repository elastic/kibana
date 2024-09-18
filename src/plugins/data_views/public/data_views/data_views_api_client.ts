/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup, HttpResponse } from '@kbn/core/public';
import { DataViewMissingIndices } from '../../common/lib';
import { GetFieldsOptions, IDataViewsApiClient } from '../../common';
import { FieldsForWildcardResponse } from '../../common/types';
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
 * Data Views API Client - client implementation
 */
export class DataViewsApiClient implements IDataViewsApiClient {
  private http: HttpSetup;
  private getCurrentUserId: () => Promise<string | undefined>;

  /**
   * constructor
   * @param http http dependency
   */
  constructor(http: HttpSetup, getCurrentUserId: () => Promise<string | undefined>) {
    this.http = http;
    this.getCurrentUserId = getCurrentUserId;
  }

  private async _request<T = unknown>(
    url: string,
    query?: {},
    body?: string,
    forceRefresh?: boolean
  ): Promise<HttpResponse<T> | undefined> {
    const asResponse = true;
    const cacheOptions: { cache?: RequestCache } = forceRefresh ? { cache: 'no-cache' } : {};
    const userId = await this.getCurrentUserId();

    const userHash = userId ? await sha1(userId) : '';

    const request = body
      ? this.http.post<T>(url, { query, body, version, asResponse })
      : this.http.fetch<T>(url, {
          query,
          version,
          ...cacheOptions,
          asResponse,
          headers: { 'user-hash': userHash },
        });

    return request.catch((resp) => {
      if (resp.body.statusCode === 404 && resp.body.attributes?.code === 'no_matching_indices') {
        throw new DataViewMissingIndices(resp.body.message);
      }

      throw new Error(resp.body.message || resp.body.error || `${resp.body.statusCode} Response`);
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
      indexFilter,
      includeUnmapped,
      fields,
      forceRefresh,
      allowHidden,
      fieldTypes,
      includeEmptyFields,
    } = options;
    const path = indexFilter ? FIELDS_FOR_WILDCARD_PATH : FIELDS_PATH;
    const versionQueryParam = indexFilter ? {} : { apiVersion: version };

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
        fieldTypes,
        // default to undefined to keep value out of URL params and improve caching
        allow_hidden: allowHidden || undefined,
        include_empty_fields: includeEmptyFields,
        ...versionQueryParam,
      },
      indexFilter ? JSON.stringify({ index_filter: indexFilter }) : undefined,
      forceRefresh
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
