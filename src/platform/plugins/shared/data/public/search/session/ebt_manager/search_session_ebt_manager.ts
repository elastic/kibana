/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { PublicContract } from '@kbn/utility-types';
import type { SearchSessionSavedObject } from '../sessions_client';
import {
  BG_SEARCH_CANCEL,
  BG_SEARCH_COMPLETE,
  BG_SEARCH_ERROR,
  BG_SEARCH_LIST_VIEW,
  BG_SEARCH_OPEN,
  BG_SEARCH_START,
} from './constants';

export type ISearchSessionEBTManager = PublicContract<SearchSessionEBTManager>;

export class SearchSessionEBTManager {
  private reportEventCore: CoreSetup['analytics']['reportEvent'];

  constructor({ core }: { core: CoreSetup }) {
    this.reportEventCore = core.analytics.reportEvent;
  }

  private reportEvent(...args: Parameters<CoreSetup['analytics']['reportEvent']>) {
    if (!this.reportEventCore) return;
    this.reportEventCore(...args);
  }

  public trackBgsStarted({ session }: { session: SearchSessionSavedObject }) {
    const query = session.attributes.restoreState?.query as Query | AggregateQuery | undefined;
    const queryString = this.getQueryString(query);

    this.reportEvent(BG_SEARCH_START, {
      query_lang: this.getQueryLanguage(query),
      session_id: session.attributes.sessionId,
      query_chars_bucket: this.getQueryStringCharCount(queryString),
      query_lines_bucket: this.getQueryStringLineCount(queryString),
    });
  }

  public trackBgsCompleted({
    trackingData,
    session,
  }: {
    trackingData: {
      runtimeMs: number;
      resultsCount: number;
      resultsBytesSize: number;
    };
    session: SearchSessionSavedObject;
  }) {
    this.reportEvent(BG_SEARCH_COMPLETE, {
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
      runtime_ms: trackingData.runtimeMs,
      result_rows_bucket: trackingData.resultsCount,
      result_bytes_bucket: trackingData.resultsBytesSize,
    });
  }

  public trackBgsError({ session, error }: { session: SearchSessionSavedObject; error: Error }) {
    const errorType = 'attributes' in error ? (error as any).attributes.error?.type : undefined;
    const httpStatus = 'attributes' in error ? (error as any).attributes.rawResponse?.status : -1;

    this.reportEvent(BG_SEARCH_ERROR, {
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
      error_type: errorType,
      http_status: httpStatus,
    });
  }

  public trackBgsCancelled({
    session,
    cancelSource,
  }: {
    session: SearchSessionSavedObject;
    cancelSource: string;
  }) {
    this.reportEvent(BG_SEARCH_CANCEL, {
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
      cancel_source: cancelSource,
    });
  }

  public trackBgsOpened({ session }: { session: SearchSessionSavedObject }) {
    this.reportEvent(BG_SEARCH_OPEN, {
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
    });
  }

  public trackBgsListView({ entryPoint }: { entryPoint: string }) {
    this.reportEvent(BG_SEARCH_LIST_VIEW, {
      entry_point: entryPoint,
    });
  }

  private getQueryLanguage(query: Query | AggregateQuery | undefined) {
    if (!query) return '';
    if ('language' in query) return query.language;
    return 'esql';
  }

  private getQueryString(query: Query | AggregateQuery | undefined) {
    if (!query) return '';
    if ('query' in query && typeof query.query === 'string') return query.query;
    if ('esql' in query) return query.esql;
    return '';
  }

  private getQueryStringCharCount(queryString: string) {
    return queryString.replace(/\n/g, '').length;
  }

  private getQueryStringLineCount(queryString: string) {
    return queryString.split('\n').length;
  }
}
