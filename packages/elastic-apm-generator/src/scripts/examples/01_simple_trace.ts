/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { service, timerange, getTransactionMetrics, getSpanDestinationMetrics } from '../..';

export function simpleTrace(from: number, to: number) {
  const instance = service('opbeans-go', 'production', 'go').instance('instance');

  const range = timerange(from, to);

  const transactionName = '100rpm (75% success) failed 1000ms';

  const successfulTraceEvents = range
    .interval('1m')
    .rate(75)
    .flatMap((timestamp) =>
      instance
        .transaction(transactionName)
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instance
            .span('GET apm-*/_search', 'db', 'elasticsearch')
            .duration(1000)
            .success()
            .destination('elasticsearch')
            .timestamp(timestamp),
          instance.span('custom_operation', 'app').duration(50).success().timestamp(timestamp)
        )
        .serialize()
    );

  const failedTraceEvents = range
    .interval('1m')
    .rate(25)
    .flatMap((timestamp) =>
      instance
        .transaction(transactionName)
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .serialize()
    );

  const events = successfulTraceEvents.concat(failedTraceEvents);

  return events.concat(getTransactionMetrics(events)).concat(getSpanDestinationMetrics(events));
}
