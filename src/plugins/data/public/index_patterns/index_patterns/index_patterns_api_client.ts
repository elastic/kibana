/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpSetup } from 'src/core/public';
import { IndexPatternMissingIndices } from '../../../common/index_patterns/lib';
import {
  GetFieldsOptions,
  IIndexPatternsApiClient,
  GetFieldsOptionsTimePattern,
} from '../../../common/index_patterns/types';

const API_BASE_URL: string = `/api/index_patterns/`;

export class IndexPatternsApiClient implements IIndexPatternsApiClient {
  private http: HttpSetup;

  constructor(http: HttpSetup) {
    this.http = http;
  }

  private _request(url: string, query: any) {
    return this.http
      .fetch(url, {
        query,
      })
      .catch((resp: any) => {
        if (resp.body.statusCode === 404 && resp.body.attributes?.code === 'no_matching_indices') {
          throw new IndexPatternMissingIndices(resp.body.message);
        }

        throw new Error(resp.body.message || resp.body.error || `${resp.body.statusCode} Response`);
      });
  }

  private _getUrl(path: string[]) {
    return API_BASE_URL + path.filter(Boolean).map(encodeURIComponent).join('/');
  }

  getFieldsForTimePattern(options: GetFieldsOptionsTimePattern) {
    const { pattern, lookBack, metaFields } = options;

    const url = this._getUrl(['_fields_for_time_pattern']);

    return this._request(url, {
      pattern,
      look_back: lookBack,
      meta_fields: metaFields,
    }).then((resp: any) => resp.fields);
  }

  getFieldsForWildcard({ pattern, metaFields, type, rollupIndex, allowNoIndex }: GetFieldsOptions) {
    return this._request(this._getUrl(['_fields_for_wildcard']), {
      pattern,
      meta_fields: metaFields,
      type,
      rollup_index: rollupIndex,
      allow_no_index: allowNoIndex,
    }).then((resp: any) => resp.fields || []);
  }
}
