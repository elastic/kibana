/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates APM transaction events where the 60m transaction metrics for one transaction group
 * are intentionally timestamp-shifted relative to the underlying trace sample.
 *
 * Goal:
 * - Reproduce a UI symptom where a transaction group is missing in "Last 24 hours" but appears in
 *   "Last 48 hours", even though a trace sample exists within the last 24 hours.
 *
 * Data shape:
 * - One service (transaction type: `exec`) with two transaction groups:
 *   - `VisibleTransactionDefault` (appears in 24h + 48h)
 *   - `InvisibleTransactionDefault` (trace sample is within 24h, but its 60m
 *     transaction metric is shifted to fall outside the 24h range)
 * - The long transaction has a large duration (~46 minutes) to match the customer screenshots.
 *
 * How to validate (Kibana Dev Tools):
 * - Verify the trace sample is within 24h:
 *   POST /traces-apm*
 *   /_search
 *   {
 *     "size": 5,
 *     "query": {
 *       "bool": {
 *         "filter": [
 *           { "term": { "service.environment": "<ENVIRONMENT_FROM_SCENARIO>" } },
 *           { "term": { "service.name": "<SERVICE_NAME_FROM_SCENARIO>" } },
 *           { "term": { "processor.event": "transaction" } },
 *           { "term": { "transaction.name": "InvisibleTransactionDefault" } }
 *         ]
 *       }
 *     },
 *     "sort": [{ "@timestamp": "desc" }],
 *     "_source": ["@timestamp","trace.id","transaction.name","transaction.type","transaction.duration.us"]
 *   }
 *
 * - Verify the 60m transaction metric for the long transaction is older than 24h (but within 48h):
 *   POST /metrics-apm*
 *   /_search
 *   {
 *     "size": 5,
 *     "query": {
 *       "bool": {
 *         "filter": [
 *           { "term": { "service.environment": "<ENVIRONMENT_FROM_SCENARIO>" } },
 *           { "term": { "service.name": "<SERVICE_NAME_FROM_SCENARIO>" } },
 *           { "term": { "processor.event": "metric" } },
 *           { "term": { "metricset.name": "transaction" } },
 *           { "term": { "metricset.interval": "60m" } },
 *           { "term": { "transaction.name": "InvisibleTransactionDefault" } }
 *         ]
 *       }
 *     },
 *     "sort": [{ "@timestamp": "desc" }],
 *     "_source": ["@timestamp","metricset.interval","metricset.name","transaction.name","transaction.duration.summary"]
 *   }
 *
 */
import { Readable, Transform } from 'stream';
import type { ApmFields, Serializable } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema, httpExitSpan } from '@kbn/synthtrace-client';
import type { Scenario, ScenarioInitOptions } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const SERVICE_NAME_BASE = 'synth-rollup-mismatch-compensation-eco-sync';
const TRANSACTION_TYPE = 'exec';

const VISIBLE_IN_DEFAULT = 'VisibleTransactionDefault';
const HIDDEN_IN_DEFAULT = 'InvisibleTransactionDefault';

const LONG_TRANSACTION_DURATION_MS = 46 * 60 * 1000;

const METRIC_TIMESTAMP_SHIFT_MS = 8 * 60 * 60 * 1000;

function toSafeSuffix(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/[^a-zA-Z0-9_-]+/g, '_');
}

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }: ScenarioInitOptions) => {
  const suffix = toSafeSuffix((scenarioOpts as Record<string, unknown> | undefined)?.suffix);
  const environment = getSynthtraceEnvironment(__filename, suffix);
  const serviceName = suffix ? `${SERVICE_NAME_BASE}-${suffix}` : SERVICE_NAME_BASE;

  return {
    setupPipeline: ({ apmEsClient }) => {
      const basePipeline = apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Default, {
        includePipelineSerialization: true,
      });

      apmEsClient.setPipeline((base) => {
        const shift60mMetricTimestampTransform = new Transform({
          objectMode: true,
          transform(doc: Record<string, unknown>, _encoding, callback) {
            const processor =
              typeof doc.processor === 'object' && doc.processor !== null
                ? (doc.processor as Record<string, unknown>)
                : undefined;
            const metricset =
              typeof doc.metricset === 'object' && doc.metricset !== null
                ? (doc.metricset as Record<string, unknown>)
                : undefined;
            const transaction =
              typeof doc.transaction === 'object' && doc.transaction !== null
                ? (doc.transaction as Record<string, unknown>)
                : undefined;

            const processorEvent = doc['processor.event'] ?? processor?.event;
            const metricsetName = doc['metricset.name'] ?? metricset?.name;
            const metricsetInterval = doc['metricset.interval'] ?? metricset?.interval;
            const transactionName = doc['transaction.name'] ?? transaction?.name;

            const isTargetMetric =
              processorEvent === 'metric' &&
              metricsetName === 'transaction' &&
              metricsetInterval === '60m' &&
              transactionName === HIDDEN_IN_DEFAULT;

            if (isTargetMetric) {
              const ts = doc['@timestamp'];
              if (typeof ts === 'number') {
                doc['@timestamp'] = ts - METRIC_TIMESTAMP_SHIFT_MS;
              } else if (typeof ts === 'string') {
                const parsed = Date.parse(ts);
                if (!Number.isNaN(parsed)) {
                  doc['@timestamp'] = parsed - METRIC_TIMESTAMP_SHIFT_MS;
                }
              }
            }

            callback(null, doc);
          },
        });

        const piped = basePipeline(base) as unknown as NodeJS.ReadWriteStream;
        return piped.pipe(shift60mMetricTimestampTransform) as unknown as NodeJS.WritableStream;
      });

      logger.info(
        `Shifting 60m transaction metrics for ${HIDDEN_IN_DEFAULT} by ${METRIC_TIMESTAMP_SHIFT_MS}ms (service.name=${serviceName}, service.environment=${environment})`
      );
    },

    generate: ({ clients: { apmEsClient }, range }) => {
      const service = apm
        .service({ name: serviceName, environment, agentName: 'dotnet' })
        .instance('instance-a');

      const now = range.to.getTime();

      const tsLong = now - 17 * 60 * 60 * 1000;

      const tsRange1 = now - 2 * 60 * 60 * 1000;
      const tsRange2 = now - 3 * 60 * 60 * 1000;

      const events = [
        service
          .transaction({ transactionName: VISIBLE_IN_DEFAULT, transactionType: TRANSACTION_TYPE })
          .timestamp(tsRange1)
          .duration(38 * 60 * 1000)
          .success(),
        service
          .transaction({ transactionName: VISIBLE_IN_DEFAULT, transactionType: TRANSACTION_TYPE })
          .timestamp(tsRange2)
          .duration(33 * 60 * 1000)
          .success(),
        service
          .transaction({ transactionName: HIDDEN_IN_DEFAULT, transactionType: TRANSACTION_TYPE })
          .timestamp(tsLong)
          .duration(LONG_TRANSACTION_DURATION_MS)
          .success()
          .children(
            service
              .span(
                httpExitSpan({
                  spanName: 'Publish to topic.entitychanges with transaction',
                  destinationUrl: 'http://service-bus:8080',
                })
              )
              .timestamp(tsLong + 30 * 1000)
              .duration(2 * 60 * 1000)
              .success()
          ),
      ];

      const serializedEvents = events.flatMap((event) => event.serialize());

      const serializable = serializedEvents.map((event) => ({
        fields: event,
        serialize: () => [event],
      })) as Array<Serializable<ApmFields>>;

      return withClient(apmEsClient, Readable.from(serializable));
    },
  };
};

export default scenario;
