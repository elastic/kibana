/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { service, timerange, getTransactionMetrics, getSpanDestinationMetrics } from '../..';
import { getBreakdownMetrics } from '../../lib/utils/get_breakdown_metrics';

export function opbeansLoadBalancer(from: number, to: number) {
  const opbeansGoInstance = service('opbeans-go', 'production', 'go').instance(
    'opbeans-go-instance'
  );

  const opbeansJavaInstance = service('opbeans-java', 'production', 'java').instance(
    'opbeans-java-instance'
  );

  const opbeansRubyInstance = service('opbeans-ruby', 'production', 'ruby').instance(
    'opbeans-ruby-instance'
  );

  const opbeansNodeJsInstance = service('opbeans-nodejs', 'production', 'nodejs').instance(
    'opbeans-nodejs-instance'
  );

  const interval = timerange(from, to).interval('5s');

  const instances = [
    opbeansGoInstance,
    opbeansJavaInstance,
    opbeansRubyInstance,
    opbeansNodeJsInstance,
  ];

  const events = instances.flatMap((instance) => {
    const targetInstances = instances.filter((i) => i !== instance);
    return interval.rate(instances.length - 1).flatMap((timestamp, index) =>
      instance
        .transaction('GET /api/product')
        .duration(1000)
        .success()
        .timestamp(timestamp)
        .children(
          instance
            .span('GET opbeans:3000', 'external', 'http')
            .destination('opbeans:3000')
            .duration(1000)
            .timestamp(timestamp)
            .success()
            .children(
              targetInstances[index % targetInstances.length]
                .transaction('GET /api/product')
                .success()
                .duration(900)
                .timestamp(timestamp + 50)
            )
        )
        .serialize()
    );
  });

  return [
    ...events,
    ...getTransactionMetrics(events),
    ...getSpanDestinationMetrics(events),
    ...getBreakdownMetrics(events),
  ];
}
