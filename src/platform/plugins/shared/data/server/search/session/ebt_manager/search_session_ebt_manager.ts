/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core/server';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import moment from 'moment';
import {
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
    this.reportEvent(BG_SEARCH_COMPLETE, {
      app_id: session.attributes.appId ?? '',
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.attributes.sessionId,
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
    const { errorMessages, errorCodes } = this.getErrorDetails(searchStatuses);

    this.reportEvent(BG_SEARCH_ERROR, {
      app_id: session.attributes.appId ?? '',
      query_lang: this.getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.attributes.sessionId,
      error_type: errorMessages,
      http_status: errorCodes,
    });
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

  private getErrorDetails(searchStatuses: SearchSessionRequestInfo[]) {
    const errorCodes = searchStatuses.map((status) => status.error?.code).filter(Boolean);
    const errorMessages = searchStatuses.map((status) => status.error?.message).filter(Boolean);

    return {
      errorCodes: errorCodes.join(','),
      errorMessages: errorMessages.join(','),
    };
  }

  private getQueryLanguage(query: Query | AggregateQuery | undefined) {
    if (!query) return '';
    if (isOfAggregateQueryType(query)) return 'ESQL';
    return query.language;
  }
}
