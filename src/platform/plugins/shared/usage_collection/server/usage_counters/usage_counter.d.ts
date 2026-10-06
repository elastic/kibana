/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as Rx from 'rxjs';
import type { UsageCounters } from '../../common';
export interface UsageCounterParams {
  domainId: string;
  counter$: Rx.Subject<UsageCounters.v1.CounterMetric>;
  retentionPeriodDays?: number;
}
/**
 * Usage Counter allows to keep track of any events that occur.
 * By calling {@link IUsageCounter.incrementCounter} devs can notify this
 * API whenever the event happens.
 */
export interface IUsageCounter {
  /**
   * Defines a domainId (aka a namespace) under which multiple counters can be stored
   */
  domainId: string;
  /**
   * Defines custom retention period for the counters under this domain.
   * This is the number of days worth of counters that must be kept in the system indices.
   * See USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS for default value
   */
  retentionPeriodDays?: number;
  /**
   * Notifies the counter about a new event happening so it can increase the count internally.
   * @param params {@link IncrementCounterParams}
   */
  incrementCounter: (params: UsageCounters.v1.IncrementCounterParams) => void;
}
export declare class UsageCounter implements IUsageCounter {
  readonly domainId: string;
  private counter$;
  readonly retentionPeriodDays?: number | undefined;
  constructor({ domainId, counter$, retentionPeriodDays }: UsageCounterParams);
  incrementCounter: (params: UsageCounters.v1.IncrementCounterParams) => void;
}
