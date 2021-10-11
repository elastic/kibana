/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { service, timerange, getTransactionMetrics, getSpanDestinationMetrics } from '../..';
import { getBreakdownMetrics } from '../../lib/utils/get_breakdown_metrics';

export function distributedTrace(from: number, to: number) {
  const serviceAInstance = service('Service A', 'production', 'go').instance('service-a-instance');

  const serviceBInstance = service('Service B', 'production', 'java').instance(
    'service-b-instance'
  );

  const serviceCInstance = service('Service C', 'production', 'ruby').instance(
    'service-c-instance'
  );

  const timestamps = timerange(from, to).interval('5s').rate(5);

  const events = timestamps.flatMap((timestamp) => [
    ...serviceAInstance
      .transaction('GET /api/product/list')
      .duration(500)
      .success()
      .timestamp(timestamp)
      .children(
        serviceAInstance
          .span('GET apm-*/_search', 'db', 'elasticsearch')
          .timestamp(timestamp)
          .duration(100)
          .success()
          .destination('elasticsearch'),
        serviceAInstance
          .span('GET http://service-b/list-products', 'external', 'http')
          .destination('http://service-b')
          .duration(500)
          .timestamp(timestamp)
          .success()
          .children(
            serviceBInstance
              .transaction('GET /api/list-products')
              .duration(300)
              .timestamp(timestamp + 100)
              .success()
              .children(
                serviceBInstance
                  .span('GET', 'db', 'redis')
                  .timestamp(timestamp + 100)
                  .duration(50)
                  .destination()
                  .success(),
                serviceBInstance
                  .span('GET http://service-c/all-products', 'external', 'http')
                  .destination('http://service-c')
                  .duration(300)
                  .timestamp(timestamp + 100)
                  .success()
                  .children(
                    serviceCInstance
                      .transaction('GET /api/all-products')
                      .timestamp(timestamp + 150)
                      .duration(150)
                      .success()
                      .children(
                        serviceCInstance
                          .span('GET apm-*/_search', 'db', 'elasticsearch')
                          .destination()
                          .timestamp(timestamp + 150)
                          .duration(100)
                          .success()
                      )
                  )
              )
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
