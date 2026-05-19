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
import type { ContentInsightsStats } from '@kbn/content-management-content-insights-server';
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
export declare class ContentInsightsClient implements ContentInsightsClientPublic {
  private readonly deps;
  private readonly config;
  private logger;
  constructor(
    deps: {
      http: HttpStart;
      logger: Logger;
    },
    config: {
      domainId: string;
    }
  );
  track(id: string, eventType: ContentInsightsEventTypes): void;
  getStats(id: string, eventType: ContentInsightsEventTypes): Promise<ContentInsightsStats>;
}
