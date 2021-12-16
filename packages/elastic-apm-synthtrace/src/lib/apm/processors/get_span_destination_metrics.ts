/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from '../apm_fields';
import { aggregate } from '../utils/aggregate';

export function getSpanDestinationMetrics(events: ApmFields[]) {
  const exitSpans = events.filter((event) => !!event['span.destination.service.resource']);

  const metricsets = aggregate(exitSpans, [
    'event.outcome',
    'agent.name',
    'service.environment',
    'service.name',
    'span.destination.service.resource',
  ]);

  return metricsets.map((metricset) => {
    let count = 0;
    let sum = 0;

    for (const event of metricset.events) {
      count++;
      sum += event['span.duration.us']!;
    }

    return {
      ...metricset.key,
      ['metricset.name']: 'span_destination',
      'span.destination.service.response_time.sum.us': sum,
      'span.destination.service.response_time.count': count,
    };
  });
}
