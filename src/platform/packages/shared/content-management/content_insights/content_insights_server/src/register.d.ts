/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
/**
 * Configuration for the usage counter
 */
export interface ContentInsightsConfig {
  /**
   * e.g. 'dashboard'
   * passed as a domainId to usage counter apis
   */
  domainId: string;
  /**
   * Can control created routes access via security access control
   */
  routePrivileges?: string[];
  /**
   * Retention period in days for usage counter data
   */
  retentionPeriodDays?: number;
}
export interface ContentInsightsDependencies {
  usageCollection: UsageCollectionSetup;
  http: CoreSetup['http'];
  getStartServices: () => Promise<{
    usageCollection: UsageCollectionStart;
  }>;
}
export interface ContentInsightsStatsResponse {
  result: ContentInsightsStats;
}
export interface ContentInsightsStats {
  /**
   * The date from which the data is counted
   */
  from: string;
  /**
   * Total count of events
   */
  count: number;
  /**
   * Daily counts of events
   */
  daily: Array<{
    date: string;
    count: number;
  }>;
}
export declare const registerContentInsights: (
  { usageCollection, http, getStartServices }: ContentInsightsDependencies,
  config: ContentInsightsConfig
) => void;
