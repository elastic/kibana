/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import { type AggregateQuery, type Query } from '@kbn/es-query';
import type { PublicContract } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import type { SearchSessionSavedObject } from '../sessions_client';
import {
  BG_SEARCH_CANCEL,
  BG_SEARCH_LIST_VIEW,
  BG_SEARCH_OPEN,
  BG_SEARCH_START,
} from './constants';
import type { UISession } from '../sessions_mgmt/types';
import {
  getQueryLanguage,
  getQueryString,
  getQueryStringCharCount,
  getQueryStringLineCount,
} from '../../../../common';

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
    const queryString = getQueryString(query);

    this.reportEvent(BG_SEARCH_START, {
      app_id: session.attributes.appId ?? '',
      entry_point: entryPoint,
      query_lang: getQueryLanguage(query),
      session_id: session.attributes.sessionId,
      query_chars_bucket: getQueryStringCharCount(queryString),
      query_lines_bucket: getQueryStringLineCount(queryString),
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
      appId: session.attributes.appId ?? '',
      query_lang: getQueryLanguage(
        session.attributes.restoreState?.query as Query | AggregateQuery | undefined
      ),
      session_id: session.id,
      cancel_source: cancelSource,
    });
  }

  public trackBgsOpened({ session, resumeSource }: { session: UISession; resumeSource: string }) {
    this.reportEvent(BG_SEARCH_OPEN, {
      query_lang: getQueryLanguage(
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
}
