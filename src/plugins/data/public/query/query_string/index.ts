/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { Subject } from 'rxjs';
import { CoreStart } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { Query, UI_SETTINGS } from '../../../common';

export class QueryStringManager {
  private queryUpdate$ = new Subject();
  private _query: Query;

  constructor(
    private readonly storage: IStorageWrapper,
    private readonly uiSettings: CoreStart['uiSettings']
  ) {
    this._query = this.getDefaultQuery();
  }

  private getDefaultLanguage() {
    return (
      this.storage.get('kibana.userQueryLanguage') ||
      this.uiSettings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE)
    );
  }

  public getDefaultQuery() {
    return {
      query: '',
      language: this.getDefaultLanguage(),
    };
  }

  public formatQuery(query: Query | string | undefined): Query {
    if (!query) {
      return this.getDefaultQuery();
    } else if (typeof query === 'string') {
      return {
        query,
        language: this.getDefaultLanguage(),
      };
    } else {
      return query;
    }
  }

  public getQueryUpdate$ = () => {
    return this.queryUpdate$.asObservable();
  };

  public getQuery = (): Query => {
    return this._query;
  };

  /**
   * Updates the query.
   * Emits 'queryUpdate' event
   * @param {Object} time
   * @property {string|moment} time.from
   * @property {string|moment} time.to
   */
  public setQuery = (query?: Query) => {
    if (query?.language !== this._query?.language || query?.query !== this._query?.query) {
      if (!query) {
        query = this.getDefaultQuery();
      }
      this._query = query;
      this.queryUpdate$.next();
    }
  };
}

export type QueryStringContract = PublicMethodsOf<QueryStringManager>;
