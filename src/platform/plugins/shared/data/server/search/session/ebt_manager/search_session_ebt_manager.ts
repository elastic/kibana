/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core/server';
import { type AggregateQuery, type Query } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import moment from 'moment';
import {
  getQueryLanguage,
  getQueryString,
  getQueryStringCharCount,
  getQueryStringLineCount,
  type SearchSessionRequestInfo,
  type SearchSessionSavedObjectAttributes,
} from '../../../../common';
import { BG_SEARCH_COMPLETE, BG_SEARCH_ERROR } from './constants';

export interface ISearchSessionEBTManager {
  trackBgsCompleted: (args: {
    session: SavedObject<SearchSessionSavedObjectAttributes>;
    searchStatuses: SearchSessionRequestInfo[];
  }) => void;
  trackBgsError: (args: {
    session: SavedObject<SearchSessionSavedObjectAttributes>;
    searchStatuses: SearchSessionRequestInfo[];
  }) => void;
}

export class SearchSessionEBTManager {
  constructor(
    private readonly reportEventCore?: (
      eventType: string,
      eventData: Record<string, string | number>
    ) => void,
    private readonly logger?: Logger
  ) {}

  public trackBgsCompleted({
    session,
    searchStatuses,
  }: {
    session: SavedObject<SearchSessionSavedObjectAttributes>;
    searchStatuses: SearchSessionRequestInfo[];
  }) {
    const query = session.attributes.restoreState?.query as Query | AggregateQuery | undefined;
    const queryString = getQueryString(query);

    this.reportEvent(BG_SEARCH_COMPLETE, {
      app_id: session.attributes.appId ?? '',
      session_id: session.attributes.sessionId,
      query_lang: getQueryLanguage(query),
      query_chars_bucket: getQueryStringCharCount(queryString),
      query_lines_bucket: getQueryStringLineCount(queryString),
      runtime_ms: this.getSessionRuntimeMs(session.attributes, searchStatuses),
    });
  }

  public trackBgsError({
    session,
    searchStatuses,
  }: {
    session: SavedObject<SearchSessionSavedObjectAttributes>;
    searchStatuses: SearchSessionRequestInfo[];
  }) {
    const query = session.attributes.restoreState?.query as Query | AggregateQuery | undefined;
    const queryString = getQueryString(query);
    const queryLanguage = getQueryLanguage(query);
    const queryCharsBucket = getQueryStringCharCount(queryString);
    const queryLinesBucket = getQueryStringLineCount(queryString);

    for (const searchStatus of searchStatuses) {
      if (!searchStatus.error) continue;
      this.reportEvent(BG_SEARCH_ERROR, {
        app_id: session.attributes.appId ?? '',
        session_id: session.attributes.sessionId,
        query_lang: queryLanguage,
        query_chars_bucket: queryCharsBucket,
        query_lines_bucket: queryLinesBucket,
        error_type: searchStatus.error.message ?? '',
        http_status: searchStatus.error.code ?? 0,
      });
    }
  }

  private reportEvent(eventType: string, eventData: Record<string, string | number>) {
    if (!this.reportEventCore) return;
    try {
      this.reportEventCore(eventType, eventData);
    } catch (e) {
      this.logger?.error(e);
    }
  }

  private getSessionRuntimeMs(
    sessionAttributes: SearchSessionSavedObjectAttributes,
    searchStatuses: SearchSessionRequestInfo[]
  ) {
    const sessionCreatedAt = moment(sessionAttributes.created);
    let latestCompletedTime: moment.Moment | undefined;

    for (const searchStatus of searchStatuses) {
      if (!searchStatus.completedAt) continue;
      const completedAt = moment(searchStatus.completedAt);

      if (!latestCompletedTime || completedAt.isAfter(latestCompletedTime)) {
        latestCompletedTime = completedAt;
      }
    }

    if (!latestCompletedTime) return 0;
    return latestCompletedTime.diff(sessionCreatedAt);
  }
}
