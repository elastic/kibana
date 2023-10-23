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

const API_BASE_URL: string = `/api/index_patterns/`;
const version = '1';

/**
 * Data Views API Client - client implementation
 */
export class DataViewsApiClient implements IDataViewsApiClient {
  private static fieldsForWildcardRequestMap: Map<string, Promise<FieldsForWildcardResponse>> =
    new Map();
  private http: HttpSetup;

  /**
   * constructor
   * @param http http dependency
   */
  constructor(http: HttpSetup) {
    this.http = http;
  }

  private async _request<T = unknown>(
    url: string,
    query?: {},
    body?: string,
    forceRefresh?: boolean
  ): Promise<T | undefined> {
    let request: Promise<T>;

    if (body) {
      request = this.http.post<T>(url, { query, body, version });
    } else {
      request = caches.open('data-views').then(async (cache) => {
        // debugger;
        // Cache key is the URL with the query params
        const cacheKey = format({
          pathname: this.http.basePath.prepend(url),
          query,
        });

        let expiredResponse: Promise<T> | undefined;

        // Don't check the cache if we're forcing a refresh
        if (!forceRefresh) {
          const cachedResponse = await cache.match(cacheKey);

          if (cachedResponse) {
            const responseDateString = cachedResponse?.headers.get('date');

            // If the reponse doesn't have a date header, it's invalid
            if (responseDateString) {
              const responseDate = new Date(responseDateString);
              const now = new Date();
              const diff = now.getTime() - responseDate.getTime();
              const lifetime = 1000 * 60 * 5; // 5 minutes
              const isExpired = diff > lifetime;
              const json = cachedResponse.json();

              // If the response is expired we'll still return it,
              // but first we'll make a request to update the cache
              if (isExpired) {
                expiredResponse = json;
              } else {
                return json;
              }
            }
          }
        }

        const activeRequest = DataViewsApiClient.fieldsForWildcardRequestMap.get(cacheKey);

        // If there's an active request for this cache key, we either return
        // the expired response if one exists to show results sooner, or we
        // wait for the active request to finish and return its response
        if (activeRequest) {
          return expiredResponse ?? activeRequest;
        }

        const returnRequest = this.http
          .fetch<T>(url, { query, version, asResponse: true, rawResponse: true })
          .then((resp) => {
            // Clone the response so we can cache it
            const responseClone = resp.response?.clone();

            if (responseClone) {
              cache.put(cacheKey, responseClone);
            }

            return resp.response?.json();
          })
          .finally(() => {
            // Remove the request from the map since it's no longer active
            DataViewsApiClient.fieldsForWildcardRequestMap.delete(cacheKey);
          });

        // Add the request to the map so we can check for it later
        DataViewsApiClient.fieldsForWildcardRequestMap.set(cacheKey, returnRequest);

        // If there's an expired response, return it immediately,
        // otherwise wait for the current request to finish
        return expiredResponse ?? returnRequest;
      });
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
      {
        pattern,
        meta_fields: metaFields,
        type,
        rollup_index: rollupIndex,
        allow_no_index: allowNoIndex,
        include_unmapped: includeUnmapped,
        fields,
      },
      indexFilter ? JSON.stringify({ index_filter: indexFilter }) : undefined,
      forceRefresh
    ).then((response) => {
      return response || { fields: [], indices: [] };
    });
  }

  /**
   * Does a user created data view exist?
   */
  async hasUserDataView(): Promise<boolean> {
    const response = await this._request<{ result: boolean }>(
      this._getUrl(['has_user_index_pattern'])
    );
    return response?.result ?? false;
  }
}
