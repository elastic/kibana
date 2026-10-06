/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { CoreStart } from '@kbn/core/public';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
export declare class QueryStringManager {
  private readonly storage;
  private readonly uiSettings;
  private query$;
  constructor(storage: IStorageWrapper, uiSettings: CoreStart['uiSettings']);
  private getDefaultLanguage;
  getDefaultQuery(): {
    query: string;
    language: any;
  };
  formatQuery(query: Query | AggregateQuery | string | undefined): Query | AggregateQuery;
  getUpdates$: () => import('rxjs').Observable<AggregateQuery | Query>;
  getQuery: () => Query | AggregateQuery;
  /**
   * Updates the query.
   * @param {Query | AggregateQuery} query
   */
  setQuery: (query: Query | AggregateQuery) => void;
  /**
   * Resets the query to the default one.
   */
  clearQuery: () => void;
}
export type QueryStringContract = PublicMethodsOf<QueryStringManager>;
