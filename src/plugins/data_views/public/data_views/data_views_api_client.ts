/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { format } from 'url';
import { DataViewMissingIndices } from '../../common/lib';
import { GetFieldsOptions, IDataViewsApiClient } from '../../common';
import { FieldsForWildcardResponse } from '../../common/types';
import { FIELDS_FOR_WILDCARD_PATH } from '../../common/constants';
import { StaleWhileRevalidateCache } from './stale_while_revalidate_cache';

const API_BASE_URL: string = `/api/index_patterns/`;
const version = '1';

/**
 * Data Views API Client - client implementation
 */
export class DataViewsApiClient implements IDataViewsApiClient {
  /**
   * constructor
   * @param http http dependency
   * @param staleWhileRevalidateCache cache dependency
   */
  constructor(
    private readonly http: HttpSetup,
    private readonly staleWhileRevalidateCache: StaleWhileRevalidateCache
  ) {}

  private async _request<T = unknown>(
    url: string,
    cache: 'stale-while-revalidate' | 'reload' | 'no-store',
    query?: {},
    body?: string
  ): Promise<T | undefined> {
    let request: Promise<T>;

    if (body) {
      request = this.http.post<T>(url, { query, body, version });
    } else if (cache === 'no-store') {
      request = this.http.get<T>(url, { query, version });
    } else {
      request = this.staleWhileRevalidateCache
        .cachedFetch({
          url: format({
            pathname: this.http.basePath.prepend(url),
            query,
          }),
          fetch: async () => {
            const { response } = await this.http.fetch<T>(url, {
              query,
              version,
              asResponse: true,
              rawResponse: true,
            });

            return response!;
          },
          forceRefresh: cache === 'reload',
        })
        .then((resp) => resp.json());
    }

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
    } = options;
    return this._request<FieldsForWildcardResponse>(
      FIELDS_FOR_WILDCARD_PATH,
      forceRefresh ? 'reload' : 'stale-while-revalidate',
      {
        pattern,
        meta_fields: metaFields,
        type,
        rollup_index: rollupIndex,
        allow_no_index: allowNoIndex,
        include_unmapped: includeUnmapped,
        fields,
      },
      indexFilter ? JSON.stringify({ index_filter: indexFilter }) : undefined
    ).then((response) => {
      return response || { fields: [], indices: [] };
    });
  }

  /**
   * Does a user created data view exist?
   */
  async hasUserDataView(): Promise<boolean> {
    const response = await this._request<{ result: boolean }>(
      this._getUrl(['has_user_index_pattern']),
      'no-store'
    );
    return response?.result ?? false;
  }
}
