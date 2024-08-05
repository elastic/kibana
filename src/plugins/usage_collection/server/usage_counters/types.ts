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

/**
 * Provides the necessary tools to create and incremement Usage Counters
 */
export interface UsageCountersServiceSetup {
  /**
   * Returns a usage counter by domainId
   */
  getUsageCounterByDomainId: (domainId: string) => UsageCounter | undefined;
  /**
   * Registers a usage counter to collect daily aggregated plugin counter events
   */
  createUsageCounter: (domainId: string, params?: CreateUsageCounterParams) => UsageCounter;
}

export interface UsageCountersSearchParams {
  /** A set of filters to limit the results of the search operation */
  filters: UsageCountersSearchFilters;
  /** A set of options to modify the behavior of the search operation */
  options?: UsageCountersSearchOptions;
}

export interface UsageCountersSearchFilters {
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
  /** ISO date string to limit search results: get counters that are older than the provided date (if specified) */
  to?: string;
  /** Return counters from a given source only. Optional, both 'ui' and 'server' counters will be returned if omitted */
  source?: 'server' | 'ui';
}

export interface UsageCountersSearchOptions {
  /** Number of counters to retrieve per page, when querying ES (defaults to 100) */
  perPage?: number;
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
  /** Number of events captured (adds up all records) */
  count: number;
}

/**
 * Number of events counted on a given day
 */
export interface UsageCounterRecord {
  /** Date where the counter was last updated */
  updatedAt: string;
  /** Number of events captured on that day */
  count: number;
}

/**
 * Interface to allow searching for persisted usage-counters
 */
export interface UsageCountersServiceStart {
  search: (params: UsageCountersSearchParams) => Promise<UsageCountersSearchResult>;
}
