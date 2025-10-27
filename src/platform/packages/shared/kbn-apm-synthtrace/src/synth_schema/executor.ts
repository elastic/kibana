/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import datemath from '@kbn/datemath';
import type { SynthSchema } from './synth_schema_template';
import { createSchemaContext } from './schema_context';

export async function executeSchema(schema: SynthSchema, argv: any) {
  const { logger, clients } = await createSchemaContext(argv);
  const { from, to } = getTimeRange(schema, argv);
  const range = timerange(from, to, logger);

  const { apmEsClient } = clients;

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
            `Generating ${traceConfig.count} traces for transaction: ${traceConfig.name}`
          );
          const traceEvents = range
            .interval('1m')
            .rate(traceConfig.count)
            .generator((timestamp) => {
              let transaction = instance
                .transaction({ transactionName: traceConfig.name })
                .timestamp(timestamp)
                .duration(1000) // Default duration
                .success();

              // Add spans if defined
              if (traceConfig.spans && traceConfig.spans.length > 0) {
                const spans = traceConfig.spans.map((spanConfig) => {
                  const durationMs =
                    spanConfig.duration.unit === 's'
                      ? spanConfig.duration.value * 1000
                      : spanConfig.duration.value;

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
          logger.info(`Generating metrics: ${metricConfig.name}`);
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
