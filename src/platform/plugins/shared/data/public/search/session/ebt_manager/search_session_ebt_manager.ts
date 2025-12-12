/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import type { PublicContract } from '@kbn/utility-types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { Logger } from '@kbn/logging';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SearchSessionSavedObject } from '../sessions_client';
import {
  BG_SEARCH_CANCEL,
  BG_SEARCH_COMPLETE,
  BG_SEARCH_ERROR,
  BG_SEARCH_LIST_VIEW,
  BG_SEARCH_OPEN,
  BG_SEARCH_START,
} from './constants';
import type { UISession } from '../sessions_mgmt/types';

export type ISearchSessionEBTManager = PublicContract<SearchSessionEBTManager>;

export class SearchSessionEBTManager {
  private reportEventCore: CoreSetup['analytics']['reportEvent'];
  private logger: Logger;

  constructor({ core, logger }: { core: CoreSetup; logger: Logger }) {
    this.reportEventCore = core.analytics.reportEvent;
    this.logger = logger;
  }

  private reportEvent(...args: Parameters<CoreSetup['analytics']['reportEvent']>) {
    if (!this.reportEventCore) return;
    try {
      this.reportEventCore(...args);
    } catch (e) {
      this.logger.error(e);
    }
  }

  public trackBgsStarted({
    entryPoint,
    session,
  }: {
    entryPoint: string;
    session: SearchSessionSavedObject;
  }) {
    const query = session.attributes.restoreState?.query as Query | AggregateQuery | undefined;
    const queryString = this.getQueryString(query);

    this.reportEvent(BG_SEARCH_START, {
      entry_point: entryPoint,
      query_lang: this.getQueryLanguage(query),
      session_id: session.attributes.sessionId,
      query_chars_bucket: this.getQueryStringCharCount(queryString),
      query_lines_bucket: this.getQueryStringLineCount(queryString),
    });
  }

  public trackBgsCompleted({
    response,
    session,
  }: {
    response: IKibanaSearchResponse<SearchResponse> | IKibanaSearchResponse<ESQLSearchResponse>;
    session: SearchSessionSavedObject;
  }) {
    this.reportEvent(BG_SEARCH_COMPLETE, {
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
      runtime_ms: response.rawResponse.took,
      result_rows_bucket: this.getResultsCount(response),
      result_bytes_bucket: Buffer.byteLength(JSON.stringify(response.rawResponse)),
    });
  }

  public trackBgsError({ session, error }: { session: SearchSessionSavedObject; error: Error }) {
    const errorType = 'attributes' in error ? (error as any).attributes.error?.type : '';
    const httpStatus = this.getHttpStatus(error) ?? -1;

    this.reportEvent(BG_SEARCH_ERROR, {
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
      error_type: errorType ?? '',
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

  public trackBgsOpened({ session, resumeSource }: { session: UISession; resumeSource: string }) {
    this.reportEvent(BG_SEARCH_OPEN, {
      query_lang: this.getQueryLanguage(
        session.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
      resume_source: resumeSource || '',
      status: session.status,
    });
  }

  public trackBgsListView({ entryPoint }: { entryPoint: string }) {
    this.reportEvent(BG_SEARCH_LIST_VIEW, {
      entry_point: entryPoint,
    });
  }

  private getHttpStatus(error: Error) {
    if ('statusCode' in error) {
      return error.statusCode;
    }
    if ('attributes' in error) {
      return (error as any).attributes.rawResponse?.status;
    }
    return -1;
  }

  private getResultsCount(
    response: IKibanaSearchResponse<SearchResponse> | IKibanaSearchResponse<ESQLSearchResponse>
  ) {
    if ('documents_found' in response.rawResponse) {
      return response.rawResponse.documents_found || 0;
    } else if ('hits' in response.rawResponse) {
      if (response.rawResponse.hits.total) return response.rawResponse.hits.total;
      return response.rawResponse.hits.hits.length;
    }
    return 0;
  }

  private getQueryLanguage(query: Query | AggregateQuery | undefined) {
    if (!query) return '';
    if (isOfAggregateQueryType(query)) return 'esql';
    return query.language;
  }

  private getQueryString(query: Query | AggregateQuery | undefined) {
    if (!query) return '';
    if (isOfAggregateQueryType(query)) return query.esql;
    if (typeof query.query === 'string') return query.query;
    return Object.values(query.query).join('');
  }

  private getQueryStringCharCount(queryString: string) {
    return queryString.replace(/\n/g, '').length;
  }

  private getQueryStringLineCount(queryString: string) {
    return queryString.split('\n').length;
  }
}
