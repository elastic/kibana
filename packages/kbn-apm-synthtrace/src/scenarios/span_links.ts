/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compact, shuffle } from 'lodash';
import { apm, ApmFields, EntityArrayIterable, timerange } from '../..';
import { generateLongId, generateShortId } from '../lib/utils/generate_id';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

function generateExternalSpanLinks() {
  // randomly creates external span links 0 - 10
  return Array(Math.floor(Math.random() * 11))
    .fill(0)
    .map(() => ({ span: { id: generateLongId() }, trace: { id: generateShortId() } }));
}

function getSpanLinksFromEvents(events: ApmFields[]) {
  return compact(
    events.map((event) => {
      const spanId = event['span.id'];
      return spanId ? { span: { id: spanId }, trace: { id: event['trace.id']! } } : undefined;
    })
  );
}

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ from, to }) => {
      const producerInternalOnlyInstance = apm

        .service({ name: 'producer-internal-only', environment: ENVIRONMENT, agentName: 'go' })
        .instance('instance-a');
      const producerInternalOnlyEvents = timerange(
        new Date('2022-04-25T19:00:00.000Z'),
        new Date('2022-04-25T19:01:00.000Z')
      )
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return producerInternalOnlyInstance
            .transaction({ transactionName: 'Transaction A' })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              producerInternalOnlyInstance
                .span({ spanName: 'Span A', spanType: 'custom' })
                .timestamp(timestamp + 50)
                .duration(100)
                .success()
            );
        });

      const producerInternalOnlyApmFields = producerInternalOnlyEvents.toArray();
      const spanASpanLink = getSpanLinksFromEvents(producerInternalOnlyApmFields);

      const producerConsumerInstance = apm
        .service({ name: 'producer-consumer', environment: ENVIRONMENT, agentName: 'java' })
        .instance('instance-b');
      const producerConsumerEvents = timerange(from, to)
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return producerConsumerInstance
            .transaction({ transactionName: 'Transaction B' })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              producerConsumerInstance
                .span({ spanName: 'Span B', spanType: 'external' })
                .defaults({
                  'span.links': shuffle([...generateExternalSpanLinks(), ...spanASpanLink]),
                })
                .timestamp(timestamp + 50)
                .duration(900)
                .success()
            );
        });

      const producerConsumerApmFields = producerConsumerEvents.toArray();
      const spanBSpanLink = getSpanLinksFromEvents(producerConsumerApmFields);

      const consumerInstance = apm
        .service({ name: 'consumer', environment: ENVIRONMENT, agentName: 'ruby' })
        .instance('instance-c');
      const consumerEvents = timerange(from, to)
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return consumerInstance
            .transaction({ transactionName: 'Transaction C' })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              consumerInstance
                .span({ spanName: 'Span C', spanType: 'external' })
                .defaults({ 'span.links': spanBSpanLink })
                .timestamp(timestamp + 50)
                .duration(900)
                .success()
            );
        });

      return new EntityArrayIterable(producerInternalOnlyApmFields)
        .merge(consumerEvents)
        .merge(new EntityArrayIterable(producerConsumerApmFields));
    },
  };
};

export default scenario;
