/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCounters } from '../../common/types';
import type { UsageCounter } from '.';

export interface CreateUsageCounterParams {
  /**
   * Number of days a usage counter must be kept in the persistence layer.
   * See USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS for default value.
   */
  retentionPeriodDays?: number;
}

export interface GetUsageCounter {
  /**
   * Returns a usage counter by domainId
   */
  getUsageCounterByDomainId: (domainId: string) => UsageCounter | undefined;
}

/**
 * Provides the necessary tools to create and incremement Usage Counters
 */
export interface UsageCountersServiceSetup extends GetUsageCounter {
  /**
   * Registers a usage counter to collect daily aggregated plugin counter events
   */
  createUsageCounter: (domainId: string, params?: CreateUsageCounterParams) => UsageCounter;
}

export interface UsageCountersSearchParams {
  /** The domainId used to create the Counter API */
  domainId: string;
  /** The name of the counter. Optional, will return all counters in the same domainId that match the rest of filters if omitted */
  counterName?: string;
  /** The type of counter. Optional, will return all counters in the same domainId that match the rest of filters if omitted */
  counterType?: string;
  /** Namespace of the counter. Optional, counters of the 'default' namespace will be returned if omitted */
  namespace?: string;
  /** ISO date string to limit search results: get counters that are more recent than the provided date (if specified) */
  from?: string;
  /** Return counters from a given source only. Optional, both 'ui' and 'server' counters will be returned if omitted */
  source?: 'server' | 'ui';
}

/**
 * Miscellaneous options to configure the search operation
 */
export interface UsageCountersSearchOptions {
  /** Number of results to return for the given search request. Defaults to 100 */
  perPage?: number;
  /** Page offset (1-N), when retrieving results that span across multiple pages. Defaults to 1 */
  page?: number;
}

/**
 * The result of a Usage Counters search operation
 */
export interface UsageCountersSearchResult {
  /**
   * The counters that matched the search criteria
   */
  counters: UsageCounterSnapshot[];
}

/**
 * Represents the current state of a Usage Counter at a given point in time
 */
export interface UsageCounterSnapshot extends UsageCounters.v1.AbstractCounter {
  /** List of daily records captured for this counter */
  records: UsageCounterRecord[];
}

/**
 * Number of events counted on a given day
 */
export interface UsageCounterRecord {
  /** Number of events captured */
  count: number;
  /** Date where the counter was last updated */
  updatedAt: string;
}

/**
 * Interface to allow searching for persisted usage-counters
 */
export interface UsageCountersServiceStart {
  search: (
    params: UsageCountersSearchParams,
    options?: UsageCountersSearchOptions
  ) => Promise<UsageCountersSearchResult>;
}
