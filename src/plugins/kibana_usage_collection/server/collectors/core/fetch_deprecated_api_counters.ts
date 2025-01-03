/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
import { USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '@kbn/usage-collection-plugin/server';

import { createCounterFetcher, type CounterEvent } from '../common/counters';

const DEPRECATED_API_COUNTERS_FILTER = `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.attributes.counterType: deprecated_api_call\\:*`;

const mergeCounter = (counter: CounterEvent, acc?: CoreDeprecatedApiUsageStats) => {
  if (acc && acc?.apiId !== counter.counterName) {
    throw new Error(
      `Failed to merge mismatching counterNames: ${acc.apiId} with ${counter.counterName}`
    );
  }
  const isMarkedCounter = counter.counterType.endsWith(':marked_as_resolved');

  const finalCounter = {
    apiId: counter.counterName,
    apiTotalCalls: 0,
    apiLastCalledAt: 'unknown',
    totalMarkedAsResolved: 0,
    markedAsResolvedLastCalledAt: 'unknown',
    ...(acc || {}),
  };

  if (isMarkedCounter) {
    return finalCounter;
  }

  const isResolvedCounter = counter.counterType.endsWith(':resolved');
  const totalKey = isResolvedCounter ? 'totalMarkedAsResolved' : 'apiTotalCalls';
  const lastUpdatedKey = isResolvedCounter ? 'markedAsResolvedLastCalledAt' : 'apiLastCalledAt';

  const newPayload = {
    [totalKey]: (finalCounter[totalKey] || 0) + counter.total,
    [lastUpdatedKey]: counter.lastUpdatedAt,
  };

  return {
    ...finalCounter,
    ...newPayload,
  };
};

function mergeCounters(counters: CounterEvent[]): CoreDeprecatedApiUsageStats[] {
  const mergedCounters = counters.reduce((acc, counter) => {
    const { counterName } = counter;
    const existingCounter = acc[counterName];

    acc[counterName] = mergeCounter(counter, existingCounter);

    return acc;
  }, {} as Record<string, CoreDeprecatedApiUsageStats>);

  return Object.values(mergedCounters);
}

export const fetchDeprecatedApiCounterStats = (logger: Logger) => {
  return createCounterFetcher(logger, DEPRECATED_API_COUNTERS_FILTER, mergeCounters);
};
