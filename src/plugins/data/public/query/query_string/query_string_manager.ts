/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { skip } from 'rxjs/operators';
import { PublicMethodsOf } from '@kbn/utility-types';
import { CoreStart } from '@kbn/core/public';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { isEqual } from 'lodash';
import { KIBANA_USER_QUERY_LANGUAGE_KEY, UI_SETTINGS } from '../../../common';

export class QueryStringManager {
  private query$: BehaviorSubject<Query | AggregateQuery>;

  constructor(
    private readonly storage: IStorageWrapper,
    private readonly uiSettings: CoreStart['uiSettings']
  ) {
    this.query$ = new BehaviorSubject<Query | AggregateQuery>(this.getDefaultQuery());
  }

  private getDefaultLanguage() {
    return (
      this.storage.get(KIBANA_USER_QUERY_LANGUAGE_KEY) ||
      this.uiSettings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE)
    );
  }

  public getDefaultQuery() {
    return {
      query: '',
      language: this.getDefaultLanguage(),
    };
  }

  public formatQuery(query: Query | AggregateQuery | string | undefined): Query | AggregateQuery {
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

  public getUpdates$ = () => {
    return this.query$.asObservable().pipe(skip(1));
  };

  public getQuery = (): Query | AggregateQuery => {
    return this.query$.getValue();
  };

  /**
   * Updates the query.
   * @param {Query | AggregateQuery} query
   */
  public setQuery = (query: Query | AggregateQuery) => {
    const curQuery = this.query$.getValue();
    if (!isEqual(query, curQuery)) {
      this.query$.next(query);
    }
  };

  /**
   * Resets the query to the default one.
   */
  public clearQuery = () => {
    this.setQuery(this.getDefaultQuery());
  };
}

export type QueryStringContract = PublicMethodsOf<QueryStringManager>;
