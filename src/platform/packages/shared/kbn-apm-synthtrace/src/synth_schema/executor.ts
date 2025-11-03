/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm, log, timerange } from '@kbn/apm-synthtrace-client';
import datemath from '@kbn/datemath';
import type { SynthSchema } from './synth_schema_template';
import { createSchemaContext } from './schema_context';
import { validateConfigWithManifest } from './validation';

type Distribution =
  | { type: 'constant'; value: number }
  | { type: 'normal'; mean: number; sd: number }
  | { type: 'uniform'; min: number; max: number }
  | { type: 'linear'; from: number; to: number }
  | {
      type: 'piecewise';
      segments: Array<{ from?: string; to?: string; value: number | Distribution }>;
    };

function evaluateDistribution(
  dist: Distribution | number,
  timestamp: number,
  timeStart: number,
  timeEnd: number
): number {
  if (typeof dist === 'number') {
    return dist;
  }

  switch (dist.type) {
    case 'constant':
      return dist.value;
    case 'normal':
      // Simplified: return mean for now (could add random generation)
      return dist.mean;
    case 'uniform':
      // Simplified: return midpoint for now
      return (dist.min + dist.max) / 2;
    case 'linear':
      // Linear interpolation based on timestamp position in time window
      const progress = (timestamp - timeStart) / (timeEnd - timeStart);
      return dist.from + (dist.to - dist.from) * progress;
    case 'piecewise': {
      // Calculate progress percentage (0-100)
      const progressPercent = ((timestamp - timeStart) / (timeEnd - timeStart)) * 100;

      // Find matching segment
      for (const segment of dist.segments) {
        const fromPercent = segment.from ? parseFloat(segment.from.replace('%', '')) : 0;
        const toPercent = segment.to ? parseFloat(segment.to.replace('%', '')) : 100;

        if (progressPercent >= fromPercent && progressPercent < toPercent) {
          if (typeof segment.value === 'number') {
            return segment.value;
          } else {
            // Recursively evaluate nested distribution
            return evaluateDistribution(segment.value, timestamp, timeStart, timeEnd);
          }
        }
      }
      // Default to last segment or 0
      const lastSegment = dist.segments[dist.segments.length - 1];
      return typeof lastSegment.value === 'number'
        ? lastSegment.value
        : evaluateDistribution(lastSegment.value, timestamp, timeStart, timeEnd);
    }
    default:
      return 0;
  }
}

export async function executeSchema(schema: SynthSchema, argv: any) {
  // Validate schema against manifest
  const validation = validateConfigWithManifest(schema);
  if (!validation.ok) {
    const errors = validation.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
    throw new Error(`Schema validation failed:\n${errors}`);
  }

  const { logger, clients } = await createSchemaContext(argv);
  const { from, to } = getTimeRange(schema, argv);

  const range = timerange(from, to, logger);

  const { apmEsClient, logsEsClient } = clients;

  if (!schema.services) {
    logger.info('No services defined in schema');
    return;
  }

  logger.info(
    `Generating data from ${new Date(from).toISOString()} to ${new Date(to).toISOString()}`
  );

  for (const serviceConfig of schema.services) {
    logger.info(`Generating service: ${serviceConfig.name}`);
    const service = apm.service({
      name: serviceConfig.name,
      environment: serviceConfig.environment,
      agentName: serviceConfig.agentName,
    });

    for (const instanceConfig of serviceConfig.instances) {
      const instance = service.instance(instanceConfig.id);

      if (instanceConfig.traces) {
        for (const traceConfig of instanceConfig.traces) {
          logger.info(
            `Generating ${traceConfig.count || traceConfig.rate || 10} traces for transaction: ${
              traceConfig.name
            }`
          );
          const traceEvents = range
            .interval('1m')
            .rate(traceConfig.count || traceConfig.rate || 10)
            .generator((timestamp) => {
              // Calculate error rate for this timestamp
              let errorRate = 0;
              if (traceConfig.errorRate !== undefined) {
                if (typeof traceConfig.errorRate === 'number') {
                  errorRate = traceConfig.errorRate;
                } else {
                  errorRate = evaluateDistribution(
                    traceConfig.errorRate as Distribution,
                    timestamp,
                    from,
                    to
                  );
                }
              }

              // Determine if this transaction should fail based on error rate
              const shouldFail = Math.random() < errorRate;

              let transaction = instance
                .transaction({ transactionName: traceConfig.name })
                .timestamp(timestamp)
                .duration(1000) // Default duration
                .success();

              if (shouldFail) {
                transaction = transaction.failure();
              }

              // Add spans if defined
              if (traceConfig.spans && traceConfig.spans.length > 0) {
                const spans = traceConfig.spans.map((spanConfig) => {
                  // Support both durationMs (direct) and duration object format
                  let durationMs = 100; // default
                  if (spanConfig.durationMs !== undefined) {
                    durationMs = spanConfig.durationMs;
                  } else if ((spanConfig as any).duration) {
                    const dur = (spanConfig as any).duration;
                    durationMs = dur.unit === 's' ? dur.value * 1000 : dur.value;
                  }

                  return instance
                    .span({
                      spanName: spanConfig.name,
                      spanType: spanConfig.type,
                      spanSubtype: (spanConfig as any).subtype,
                    })
                    .timestamp(timestamp + 10) // Start slightly after transaction
                    .duration(durationMs)
                    .success();
                });

                transaction = transaction.children(...spans);
              }

              return transaction;
            });

          await logger.perf('index_traces', () => apmEsClient.index(traceEvents));
        }
      }

      // Generate metrics if defined
      if (instanceConfig.metrics) {
        for (const metricConfig of instanceConfig.metrics) {
          logger.info(`Generating metrics: ${metricConfig.name || 'unnamed'}`);
          const metricEvents = range
            .interval('30s')
            .rate(1)
            .generator((timestamp) => {
              // Get the metric value (support constant or dynamic behavior)
              const value =
                typeof metricConfig.behavior === 'number'
                  ? metricConfig.behavior
                  : metricConfig.behavior.type === 'linear'
                  ? metricConfig.behavior.from // Simplified for now
                  : 0;

              // Create a metrics object with the specified metric
              const metricsObj: Record<string, number> = {
                [metricConfig.name]: value,
              };

              // Add some default system metrics if not already present
              if (!metricsObj['system.memory.total']) {
                metricsObj['system.memory.total'] = 1000;
              }
              if (!metricsObj['system.cpu.total.norm.pct']) {
                metricsObj['system.cpu.total.norm.pct'] = 0.5;
              }

              return instance.appMetrics(metricsObj).timestamp(timestamp);
            });

          await logger.perf('index_metrics', () => apmEsClient.index(metricEvents));
        }
      }

      // Generate logs if defined
      if (instanceConfig.logs) {
        for (const logConfig of instanceConfig.logs) {
          logger.info(`Generating logs: ${logConfig.message || 'unnamed'}`);
          const logEvents = range
            .interval(logConfig.interval || '1m')
            .rate(logConfig.rate || 1)
            .generator((timestamp) => {
              // Calculate failure rate for this timestamp
              let failureRate = 0;
              if (logConfig.failureRate !== undefined) {
                if (typeof logConfig.failureRate === 'number') {
                  failureRate = logConfig.failureRate;
                } else {
                  failureRate = evaluateDistribution(
                    logConfig.failureRate as Distribution,
                    timestamp,
                    from,
                    to
                  );
                }
              }

              // Determine if this log should fail based on failure rate
              const shouldFail = Math.random() < failureRate;

              // Create a field name/value that exceeds 256 characters (keyword limit)
              // This will cause ingestion failures
              const LONG_FIELD_VALUE = 'x'.repeat(257); // 257 chars exceeds 256 keyword limit

              let logEvent = log
                .create()
                .message(logConfig.message || 'Generated log message')
                .logLevel(logConfig.level || 'info')
                .service(serviceConfig.name)
                .timestamp(timestamp);

              // Add a field that will cause failure if this document should fail
              if (shouldFail) {
                // Add a field with a value exceeding keyword limit (256 chars)
                // Using a custom field name that will map to keyword and fail
                logEvent = logEvent.defaults({
                  'cloud.availability_zone': LONG_FIELD_VALUE, // This field typically has ignore_above limit
                });
              }

              return logEvent;
            });

          await logger.perf('index_logs', () => logsEsClient.index(logEvents));
        }
      }
    }
  }

  logger.info('Data generation complete');
}

function getTimeRange(schema: SynthSchema, argv: any) {
  // Use timeWindow from schema if provided, otherwise fall back to argv
  const timeFrom = schema.timeWindow?.from || argv.from || 'now-1m';
  const timeTo = schema.timeWindow?.to || argv.to || 'now';

  const to = datemath.parse(String(timeTo))!.valueOf();
  const from = datemath.parse(String(timeFrom))!.valueOf();

  return { from, to };
}
