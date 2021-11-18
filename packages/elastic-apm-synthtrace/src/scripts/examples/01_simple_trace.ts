/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { service, timerange, getTransactionMetrics, getSpanDestinationMetrics } from '../..';
import { getBreakdownMetrics } from '../../lib/utils/get_breakdown_metrics';

export default function ({
  from,
  to,
  serviceName = 'opbeans-go',
  agentName = 'go',
  environment = 'production',
}: {
  from: number;
  to: number;
  serviceName?: string;
  agentName?: string;
  environment?: string;
}) {
  const numServices = 3;

  const range = timerange(from, to);

  const transactionName = '240rpm/75% 1000ms';

  const successfulTimestamps = range.interval('1s').rate(3);

  const failedTimestamps = range.interval('1s').rate(1);

  return new Array(numServices).fill(undefined).flatMap((_, index) => {
    const instance = service(`${serviceName}-${index}`, environment, agentName).instance(
      'instance'
    );

    const successfulTraceEvents = successfulTimestamps.flatMap((timestamp) =>
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
          instance.span('custom_operation', 'custom').duration(100).success().timestamp(timestamp)
        )
        .serialize()
    );

    const failedTraceEvents = failedTimestamps.flatMap((timestamp) =>
      instance
        .transaction(transactionName)
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .errors(
          instance.error('[ResponseError] index_not_found_exception').timestamp(timestamp + 50)
        )
        .serialize()
    );

    const metricsets = range
      .interval('30s')
      .rate(1)
      .flatMap((timestamp) =>
        instance
          .appMetrics({
            'system.memory.actual.free': 800,
            'system.memory.total': 1000,
            'system.cpu.total.norm.pct': 0.6,
            'system.process.cpu.total.norm.pct': 0.7,
          })
          .timestamp(timestamp)
          .serialize()
      );
    const events = successfulTraceEvents.concat(failedTraceEvents);

    return [
      ...events,
      ...metricsets,
      ...getTransactionMetrics(events),
      ...getSpanDestinationMetrics(events),
      ...getBreakdownMetrics(events),
    ];
  });
}
