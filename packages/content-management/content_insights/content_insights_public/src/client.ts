/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
  constructor(
    private readonly deps: { http: HttpStart },
    private readonly config: { domainId: string }
  ) {}

  track(id: string, eventType: ContentInsightsEventTypes) {
    this.deps.http
      .post(`/internal/content_management/insights/${this.config.domainId}/${id}/${eventType}`)
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn(`Could not track ${eventType} event for ${id}`, e);
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
