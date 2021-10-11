/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { service, timerange, getTransactionMetrics, getSpanDestinationMetrics } from '../..';
import { getBreakdownMetrics } from '../../lib/utils/get_breakdown_metrics';

export function messaging(from: number, to: number) {
  const serviceAInstance = service('Service A', 'production', 'go').instance('service-a-instance');

  const serviceBInstance = service('Service B', 'production', 'java').instance(
    'service-b-instance'
  );

  const timestamps = timerange(from, to).interval('5s').rate(5);

  const events = timestamps.flatMap((timestamp) => [
    ...serviceAInstance
      .transaction('POST /api/product/buy')
      .duration(500)
      .success()
      .timestamp(timestamp)
      .children(
        serviceAInstance
          .span('Kafka SEND to MyQueue', 'messaging', 'kafka')
          .destination('MyQueue')
          .timestamp(timestamp)
          .duration(50)
          .success()
          .children(
            serviceBInstance
              .transaction('POST /api/pay')
              .timestamp(timestamp + 150)
              .duration(50)
              .success()
          )
      )
      .serialize(),
  ]);

  return [
    ...events,
    ...getTransactionMetrics(events),
    ...getSpanDestinationMetrics(events),
    ...getBreakdownMetrics(events),
  ];
}
