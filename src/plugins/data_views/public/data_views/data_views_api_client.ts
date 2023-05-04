/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { DataViewMissingIndices } from '../../common/lib';
import { GetFieldsOptions, IDataViewsApiClient } from '../../common';
import { FieldsForWildcardResponse } from '../../common/types';

const API_BASE_URL: string = `/api/index_patterns/`;

/**
 * Data Views API Client - client implementation
 */
export class DataViewsApiClient implements IDataViewsApiClient {
  private http: HttpSetup;

  /**
   * constructor
   * @param http http dependency
   */
  constructor(http: HttpSetup) {
    this.http = http;
  }

  private _request<T = unknown>(url: string, query?: {}, body?: string): Promise<T | undefined> {
    const request = body
      ? this.http.post<T>(url, { query, body })
      : this.http.fetch<T>(url, { query });
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
    } = options;
    return this._request<FieldsForWildcardResponse>(
      this._getUrl(['_fields_for_wildcard']),
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
      this._getUrl(['has_user_index_pattern'])
    );
    return response?.result ?? false;
  }
}
