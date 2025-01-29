/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { HttpStart } from '@kbn/core-http-browser';
import type {
  ContentInsightsStats,
  ContentInsightsStatsResponse,
} from '@kbn/content-management-content-insights-server';

export type ContentInsightsEventTypes = 'viewed';

/**
 * Public interface of the Content Management Insights service.
 */
export interface ContentInsightsClientPublic {
  track(id: string, eventType: ContentInsightsEventTypes): void;
  getStats(id: string, eventType: ContentInsightsEventTypes): Promise<ContentInsightsStats>;
}

/**
 * Client for the Content Management Insights service.
 */
export class ContentInsightsClient implements ContentInsightsClientPublic {
  private logger: Logger;
  constructor(
    private readonly deps: { http: HttpStart; logger: Logger },
    private readonly config: { domainId: string }
  ) {
    this.logger = deps.logger.get('content_insights_client');
  }

  track(id: string, eventType: ContentInsightsEventTypes) {
    this.deps.http
      .post(`/internal/content_management/insights/${this.config.domainId}/${id}/${eventType}`)
      .catch((e) => {
        this.logger.warn(`Could not track ${eventType} event for ${id}. Error: ${e?.message}`, {
          error: e,
        });
      });
  }

  async getStats(id: string, eventType: ContentInsightsEventTypes) {
    return this.deps.http
      .get<ContentInsightsStatsResponse>(
        `/internal/content_management/insights/${this.config.domainId}/${id}/${eventType}/stats`
      )
      .then((response) => response.result);
  }
}
