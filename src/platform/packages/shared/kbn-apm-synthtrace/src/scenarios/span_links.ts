/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compact, shuffle } from 'lodash';
import { Readable } from 'stream';
import {
  apm,
  ApmFields,
  ApmSynthtracePipelineSchema,
  generateLongId,
  generateShortId,
  Serializable,
} from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { parseApmScenarioOpts } from './helpers/apm_scenario_ops_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

function generateExternalSpanLinks() {
  // randomly creates external span links 0 - 10
  return Array(Math.floor(Math.random() * 11))
    .fill(0)
    .map(() => ({ span: { id: generateShortId() }, trace: { id: generateLongId() } }));
}

function getSpanLinksFromEvents(events: ApmFields[]) {
  return compact(
    events.map((event) => {
      const spanId = event['span.id'];
      return spanId ? { span: { id: spanId }, trace: { id: event['trace.id']! } } : undefined;
    })
  );
}

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const { pipeline = ApmSynthtracePipelineSchema.Default } = parseApmScenarioOpts(scenarioOpts);
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const producerTimestamps = range.ratePerMinute(1);
      const producerConsumerTimestamps = range.ratePerMinute(1);
      const consumerTimestamps = range.ratePerMinute(1);

      const producerInternalOnlyInstance = apm
        .service({ name: 'producer-internal-only', environment: ENVIRONMENT, agentName: 'go' })
        .instance('instance-a');

      const producerConsumerInstance = apm
        .service({ name: 'producer-consumer', environment: ENVIRONMENT, agentName: 'java' })
        .instance('instance-b');

      const consumerInstance = apm
        .service({ name: 'consumer', environment: ENVIRONMENT, agentName: 'ruby' })
        .instance('instance-c');

      const producerInternalOnlyEvents = producerTimestamps.generator((timestamp) =>
        producerInternalOnlyInstance
          .transaction({ transactionName: 'Transaction A' })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerInternalOnlyInstance
              .span({ spanName: 'Span A', spanType: 'messaging', spanSubtype: 'kafka' })
              .timestamp(timestamp)
              .duration(100)
              .success()
          )
      );

      const serializedProducerInternalOnlyEvents = Array.from(producerInternalOnlyEvents).flatMap(
        (event) => event.serialize()
      );

      const unserializedProducerInternalOnlyEvents = serializedProducerInternalOnlyEvents.map(
        (event) => ({
          fields: event,
          serialize: () => {
            return [event];
          },
        })
      ) as Array<Serializable<ApmFields>>;

      const producerConsumerEvents = producerConsumerTimestamps.generator((timestamp) =>
        producerConsumerInstance
          .transaction({ transactionName: 'Transaction B' })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerConsumerInstance
              .span({ spanName: 'Span B', spanType: 'messaging', spanSubtype: 'kafka' })
              .defaults({
                'span.links': shuffle([
                  ...generateExternalSpanLinks(),
                  ...getSpanLinksFromEvents(serializedProducerInternalOnlyEvents),
                ]),
              })
              .timestamp(timestamp)
              .duration(900)
              .success()
          )
      );

      const serializedproducerConsumerEvents = Array.from(producerConsumerEvents).flatMap((event) =>
        event.serialize()
      );

      const unserializedproducerConsumerEvents = serializedproducerConsumerEvents.map((event) => ({
        fields: event,
        serialize: () => {
          return [event];
        },
      })) as Array<Serializable<ApmFields>>;

      const consumerEvents = consumerTimestamps.generator((timestamp) =>
        consumerInstance
          .transaction({ transactionName: 'Transaction C' })
          .timestamp(timestamp)
          .defaults({
            'span.links': getSpanLinksFromEvents(serializedproducerConsumerEvents),
          })
          .duration(1000)
          .success()
      );

      return withClient(
        apmEsClient,
        logger.perf('generating_span_links', () =>
          Readable.from([
            ...unserializedProducerInternalOnlyEvents,
            ...unserializedproducerConsumerEvents,
            ...Array.from(consumerEvents),
          ])
        )
      );
    },
    setupPipeline: ({ apmEsClient }) =>
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(pipeline)),
  };
};

export default scenario;
