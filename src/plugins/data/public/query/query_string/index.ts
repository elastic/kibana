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
  private defaultLanguage: string;

  constructor(storage: IStorageWrapper, uiSettings: CoreStart['uiSettings']) {
    this.defaultLanguage =
      storage.get('kibana.userQueryLanguage') || uiSettings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE);

    uiSettings.get$(UI_SETTINGS.SEARCH_QUERY_LANGUAGE).subscribe((defaultLanguage: string) => {
      this.defaultLanguage = defaultLanguage;
    });

    this._query = this.getDefaultQuery();
  }

  private getDefaultQuery() {
    return {
      query: '',
      language: this.defaultLanguage,
    };
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
    if (query?.language !== this._query?.language || query?.query !== this._query?.language) {
      if (!query) {
        query = this.getDefaultQuery();
      }
      this._query = query;
      this.queryUpdate$.next();
    }
  };
}

export type QueryStringContract = PublicMethodsOf<QueryStringManager>;
