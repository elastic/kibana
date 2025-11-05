/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apm,
  log,
  syntheticsMonitor,
  timerange,
  generateShortId,
} from '@kbn/apm-synthtrace-client';
import datemath from '@kbn/datemath';
import type { SynthSchema } from './synth_schema_template';
import { createSchemaContext } from './schema_context';
import { validateConfigWithManifest } from './validation';

// Constant for creating failed documents - exceeds ignore_above: 1024 limit
const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

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

export async function executeSchema(
  schema: SynthSchema,
  argv: any
): Promise<{
  indexedIndices: string[];
}> {
  // Validate schema against manifest
  const validation = validateConfigWithManifest(schema);
  if (!validation.ok) {
    const errors = validation.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
    throw new Error(`Schema validation failed:\n${errors}`);
  }

  const { logger, clients, clientManager } = await createSchemaContext(argv);
  const { from, to } = getTimeRange(schema, argv);

  const range = timerange(from, to, logger);

  const { apmEsClient, logsEsClient, syntheticsEsClient } = clients;
  const indexedClients = new Set<
    typeof apmEsClient | typeof logsEsClient | typeof syntheticsEsClient
  >();

  // Check if any log config has failureRate > 0 - if so, set up failure store infrastructure
  let needsFailureStore = false;
  const datasetsNeedingFailureStore = new Set<string>();
  if (schema.services) {
    for (const service of schema.services) {
      for (const instance of service.instances) {
        if (instance.logs) {
          for (const logConfig of instance.logs) {
            if (logConfig.failureRate !== undefined) {
              const failureRateValue =
                typeof logConfig.failureRate === 'number'
                  ? logConfig.failureRate
                  : logConfig.failureRate.type === 'constant'
                  ? logConfig.failureRate.value
                  : 0.5; // Default for distributions
              if (failureRateValue > 0) {
                needsFailureStore = true;
                // Collect datasets that need failure store
                if (logConfig.dataset) {
                  const datasets = Array.isArray(logConfig.dataset)
                    ? logConfig.dataset
                    : [logConfig.dataset];
                  datasets.forEach((ds) => datasetsNeedingFailureStore.add(ds));
                } else {
                  // If no dataset specified, we'll need to create a template for the default pattern
                  datasetsNeedingFailureStore.add('*');
                }
              }
            }
          }
        }
      }
    }
  }

  // Set up failure store infrastructure if needed
  if (needsFailureStore && logsEsClient) {
    await setupFailureStoreInfrastructure(logsEsClient, logger, datasetsNeedingFailureStore);
  }

  if (!schema.services || schema.services.length === 0) {
    logger.info('No services defined in schema');
    return {
      indexedIndices: [],
    };
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

              // Calculate transaction duration from spans if available, otherwise use default
              let transactionDuration = 1000; // Default duration
              const spanDurations: number[] = [];

              // Pre-calculate span durations to determine transaction duration
              if (traceConfig.spans && traceConfig.spans.length > 0) {
                for (const spanConfig of traceConfig.spans) {
                  let durationMs = 100; // default
                  if (spanConfig.durationMs !== undefined) {
                    if (typeof spanConfig.durationMs === 'number') {
                      durationMs = spanConfig.durationMs;
                    } else if (
                      typeof spanConfig.durationMs === 'object' &&
                      spanConfig.durationMs !== null &&
                      'type' in spanConfig.durationMs
                    ) {
                      // It's a distribution - evaluate it based on timestamp
                      durationMs = evaluateDistribution(
                        spanConfig.durationMs as Distribution,
                        timestamp,
                        from,
                        to
                      );
                    } else {
                      durationMs = spanConfig.durationMs as number;
                    }
                  } else if ((spanConfig as any).duration) {
                    const dur = (spanConfig as any).duration;
                    durationMs = dur.unit === 's' ? dur.value * 1000 : dur.value;
                  }
                  spanDurations.push(durationMs);
                }
                // Transaction duration is sum of all span durations plus some overhead
                transactionDuration = spanDurations.reduce((sum, d) => sum + d, 0) + 50; // 50ms overhead
              }

              let transaction = instance
                .transaction({ transactionName: traceConfig.name })
                .timestamp(timestamp)
                .duration(transactionDuration)
                .success();

              if (shouldFail) {
                transaction = transaction.failure();
              }

              // Add spans if defined
              if (traceConfig.spans && traceConfig.spans.length > 0) {
                const spans = traceConfig.spans.map((spanConfig, index) => {
                  // Use pre-calculated duration
                  const durationMs = spanDurations[index];

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
          indexedClients.add(apmEsClient);
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
          indexedClients.add(apmEsClient);
        }
      }

      // Generate logs if defined
      if (instanceConfig.logs) {
        for (const logConfig of instanceConfig.logs) {
          logger.info(`Generating logs: ${logConfig.message || 'unnamed'}`);
          const logEvents = range
            .interval(logConfig.interval || '1m')
            .rate(logConfig.rate || 1)
            .generator((timestamp, index) => {
              // Calculate degraded/ignored rate for this timestamp
              // degradedRate and ignoredRate are aliases - use whichever is provided
              const degradedRateConfig = logConfig.degradedRate ?? logConfig.ignoredRate;
              let degradedRate = 0;
              if (degradedRateConfig !== undefined) {
                if (typeof degradedRateConfig === 'number') {
                  degradedRate = degradedRateConfig;
                } else {
                  degradedRate = evaluateDistribution(
                    degradedRateConfig as Distribution,
                    timestamp,
                    from,
                    to
                  );
                }
              }

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

              // Determine if this log should fail (goes to failure store, not indexed)
              // Failed docs take precedence - calculate this first
              const shouldFail = Math.random() < failureRate;

              // Determine if this log should be degraded/ignored (indexed but with _ignore)
              // Degraded docs are mutually exclusive with failed docs
              // When both rates are specified, degradedRate represents the percentage of ALL documents
              // that should be degraded (not overlapping with failed docs)
              // To achieve the target degradedRate percentage of total documents while excluding failed docs,
              // we adjust the probability: degradedRate / (1 - failureRate)
              // Example: failureRate=0.5, degradedRate=0.25 means:
              //   - 50% failed, 25% degraded (from remaining 50%: 0.25/0.5 = 50% chance), 25% normal
              let isDegraded = false;
              if (!shouldFail && degradedRate > 0) {
                const adjustedDegradedRate =
                  failureRate > 0 && failureRate < 1
                    ? degradedRate / (1 - failureRate)
                    : degradedRate;
                isDegraded = Math.random() < adjustedDegradedRate;
              }

              // Helper function to rotate through array values
              const getRotatedValue = <T>(value: T | T[] | undefined, defaultValue: T): T => {
                if (!value) return defaultValue;
                if (Array.isArray(value)) {
                  return value[index % value.length];
                }
                return value;
              };

              // Create log event - conditionally set log level based on failure
              let logEvent = log
                .create()
                .message(logConfig.message || 'Generated log message')
                .service(serviceConfig.name)
                .timestamp(timestamp);

              // Set log level
              // For failed docs: Don't call .logLevel() at all, then set log.level to undefined in defaults
              // For degraded docs: Set log.level to MORE_THAN_1024_CHARS to exceed ignore_above limit
              // This matches failed_logs.ts and degraded_logs.ts scenarios
              if (shouldFail) {
                // Failed docs: omit log.level entirely (will be set to undefined in defaults)
                // This triggers fail processor that checks for ctx['log.level'] == null
              } else if (isDegraded) {
                // Degraded docs: set log.level to value exceeding ignore_above: 1024 limit
                // This causes the field to be ignored but document is still indexed
                logEvent = logEvent.logLevel(MORE_THAN_1024_CHARS);
              } else {
                // Normal log level
                logEvent = logEvent.logLevel(logConfig.level || 'info');
              }

              // Apply dataset (with rotation support)
              if (logConfig.dataset) {
                const datasetValue = Array.isArray(logConfig.dataset)
                  ? logConfig.dataset[index % logConfig.dataset.length]
                  : logConfig.dataset;
                logEvent = logEvent.dataset(datasetValue);
              }

              // Apply namespace (with rotation support)
              if (logConfig.namespace) {
                const namespaceValue = Array.isArray(logConfig.namespace)
                  ? logConfig.namespace[index % logConfig.namespace.length]
                  : logConfig.namespace;
                logEvent = logEvent.namespace(namespaceValue);
              }

              // Apply hostName (with rotation support)
              if (logConfig.hostName) {
                const hostNameValue = Array.isArray(logConfig.hostName)
                  ? logConfig.hostName[index % logConfig.hostName.length]
                  : logConfig.hostName;
                logEvent = logEvent.hostName(hostNameValue);
              }

              // Apply containerId (with rotation support)
              if (logConfig.containerId) {
                const containerIdValue = Array.isArray(logConfig.containerId)
                  ? logConfig.containerId[index % logConfig.containerId.length]
                  : logConfig.containerId;
                logEvent = logEvent.containerId(containerIdValue);
              }

              // Build defaults object for additional fields
              const defaults: Record<string, unknown> = {};

              // For failed docs, set log.level to undefined in defaults to trigger fail processor
              // This matches the failed_logs.ts scenario's datasetSynth3Logs approach:
              // .defaults({ 'log.level': isFailed ? undefined : level })
              // Since we didn't call .logLevel() for failed docs, the field doesn't exist yet,
              // so defaults will set it to undefined, which serializes to omitted field
              if (shouldFail) {
                defaults['log.level'] = undefined;
              }
              // Note: For degraded docs, log.level is already set to MORE_THAN_1024_CHARS above

              // Add custom fields under log.custom namespace
              if (logConfig.customFields) {
                const generatedCustomFields = generateCustomFields(
                  logConfig.customFields,
                  index,
                  timestamp,
                  isDegraded,
                  shouldFail
                );
                Object.assign(defaults, generatedCustomFields);
              }

              // Add cloud fields
              if (logConfig.cloud) {
                if (logConfig.cloud.provider) {
                  defaults['cloud.provider'] = logConfig.cloud.provider;
                }
                if (logConfig.cloud.region) {
                  defaults['cloud.region'] = logConfig.cloud.region;
                }
                // For degraded/ignored docs, override availability_zone with value exceeding ignore_above limit
                // For failed docs, we can also set it but failed docs go to failure store anyway
                // This must come AFTER user config to ensure it overrides
                if (isDegraded || shouldFail) {
                  defaults['cloud.availability_zone'] = MORE_THAN_1024_CHARS; // Exceeds ignore_above: 1024
                } else if (logConfig.cloud.availabilityZone) {
                  defaults['cloud.availability_zone'] = logConfig.cloud.availabilityZone;
                }
                if (logConfig.cloud.projectId) {
                  defaults['cloud.project.id'] = logConfig.cloud.projectId;
                }
                if (logConfig.cloud.instanceId) {
                  defaults['cloud.instance.id'] = logConfig.cloud.instanceId;
                }
              } else if (isDegraded || shouldFail) {
                // If no cloud config provided, still add the degraded/failing field
                defaults['cloud.availability_zone'] = MORE_THAN_1024_CHARS;
              }

              // Add orchestrator fields
              if (logConfig.orchestrator) {
                if (logConfig.orchestrator.clusterName) {
                  defaults['orchestrator.cluster.name'] = logConfig.orchestrator.clusterName;
                }
                if (logConfig.orchestrator.clusterId) {
                  defaults['orchestrator.cluster.id'] = logConfig.orchestrator.clusterId;
                }
                if (logConfig.orchestrator.namespace) {
                  defaults['orchestrator.namespace'] = logConfig.orchestrator.namespace;
                }
                if (logConfig.orchestrator.resourceId) {
                  defaults['orchestrator.resource.id'] = logConfig.orchestrator.resourceId;
                }
              }

              // Add correlation fields
              if (logConfig.traceId) {
                defaults['trace.id'] = logConfig.traceId;
              }
              if (logConfig.transactionId) {
                defaults['transaction.id'] = logConfig.transactionId;
              }
              if (logConfig.agentId) {
                defaults['agent.id'] = logConfig.agentId;
              }
              if (logConfig.agentName) {
                defaults['agent.name'] = logConfig.agentName;
              }
              if (logConfig.logFilePath) {
                defaults['log.file.path'] = logConfig.logFilePath;
              }

              // Apply all defaults
              if (Object.keys(defaults).length > 0) {
                logEvent = logEvent.defaults(defaults);
              }

              // For failed docs, ensure log.level field is removed (in case it was set elsewhere)
              // This ensures the field is omitted, triggering fail processor that checks for null
              if (shouldFail) {
                logEvent = logEvent.deleteField('log.level');
              }

              // Note: Document handling:
              // DEGRADED/IGNORED documents (isDegraded = true):
              //   - Documents ARE indexed but have non-empty _ignore property
              //   - Fields exceed ignore_above: 1024 limits (e.g., log.level, cloud.availability_zone)
              //   - These cause mapping conflicts but documents are still indexed
              // FAILED documents (shouldFail = true):
              //   - Documents FAIL ingestion entirely and go to failure store
              //   - log.level field is omitted (undefined) - triggers fail processor
              //   - These documents are NOT indexed in normal indexes

              return logEvent;
            });

          await logger.perf('index_logs', () => logsEsClient.index(logEvents));
          indexedClients.add(logsEsClient);
        }
      }

      // Generate synthetics monitors if defined
      if ((instanceConfig as any).synthetics && syntheticsEsClient) {
        for (const syntheticsConfig of (instanceConfig as any).synthetics) {
          // Validate required fields
          const monitorId = (syntheticsConfig as any).monitorId;
          const origin = (syntheticsConfig as any).origin;

          if (!monitorId) {
            throw new Error(
              `monitorId is required for synthetics monitors. Service: ${
                serviceConfig.name
              }, Monitor: ${(syntheticsConfig as any).name || 'unnamed'}`
            );
          }

          if (!origin) {
            throw new Error(
              `origin (location) is required for synthetics monitors. Service: ${
                serviceConfig.name
              }, Monitor: ${(syntheticsConfig as any).name || 'unnamed'}`
            );
          }

          logger.info(
            `Generating synthetics monitors: ${
              (syntheticsConfig as any).name || 'unnamed'
            }, monitorId: ${monitorId}, origin: ${origin}`
          );
          const monitorEvents = range
            .interval((syntheticsConfig as any).interval || '1m')
            .rate((syntheticsConfig as any).rate || 1)
            .generator((timestamp) => {
              const monitorType = ((syntheticsConfig as any).type || 'http') as 'http' | 'browser';
              const monitorName =
                (syntheticsConfig as any).name || `Monitor for ${serviceConfig.name}`;

              // Determine status based on error rate if specified
              let status = 'up';
              if ((syntheticsConfig as any).errorRate !== undefined) {
                const errorRateValue =
                  typeof (syntheticsConfig as any).errorRate === 'number'
                    ? (syntheticsConfig as any).errorRate
                    : 0.1;
                status = Math.random() < errorRateValue ? 'down' : 'up';
              }

              // Generate response time (duration) if specified
              let durationUs: number | undefined;
              if ((syntheticsConfig as any).durationMs !== undefined) {
                const durationConfig = (syntheticsConfig as any).durationMs;
                let durationValue: number;
                if (typeof durationConfig === 'number') {
                  durationValue = durationConfig;
                } else if (durationConfig.type === 'uniform') {
                  // Uniform distribution
                  const min = durationConfig.min || 200;
                  const max = durationConfig.max || 2000;
                  durationValue = Math.random() * (max - min) + min;
                } else {
                  durationValue = evaluateDistribution(
                    durationConfig as Distribution,
                    timestamp,
                    from,
                    to
                  );
                }
                durationUs = durationValue * 1000; // Convert ms to microseconds
              } else {
                // Default duration based on status
                durationUs = status === 'down' ? 5000000 : 200000; // 5s for down, 200ms for up
              }

              const monitor = syntheticsMonitor
                .create()
                .dataset(monitorType)
                .name(monitorName)
                .origin(origin) // Required: location where monitor runs from
                .status(status)
                .timestamp(timestamp)
                .defaults({
                  'monitor.id': monitorId, // Required: unique monitor identifier
                  'monitor.check_group': generateShortId(),
                  'monitor.timespan.lt': new Date(timestamp + 60000).toISOString(),
                  'monitor.timespan.gte': new Date(timestamp).toISOString(),
                  ...(durationUs && { 'monitor.duration.us': durationUs }),
                  ...((syntheticsConfig as any).ip && {
                    'monitor.ip': (syntheticsConfig as any).ip,
                  }),
                  ...((syntheticsConfig as any).url && {
                    'url.full': (syntheticsConfig as any).url,
                  }),
                });

              return monitor;
            });

          await logger.perf('index_synthetics', () => syntheticsEsClient.index(monitorEvents));
          indexedClients.add(syntheticsEsClient);
        }
      }
    }
  }

  // Refresh all indexed indices to make them immediately searchable
  const indexedIndices: string[] = [];
  for (const client of indexedClients) {
    const clientIndices = client.getAllIndices();
    indexedIndices.push(...clientIndices);
    if (clientIndices.length > 0) {
      logger.info(`Refreshing indices: ${clientIndices.join(', ')}`);
      await client.refresh();
    }
  }

  logger.info('Data generation complete');

  return {
    indexedIndices: Array.from(new Set(indexedIndices)),
  };
}

function getTimeRange(schema: SynthSchema, argv: any) {
  // Use timeWindow from schema if provided, otherwise fall back to argv
  const timeFrom = schema.timeWindow?.from || argv.from || 'now-1m';
  const timeTo = schema.timeWindow?.to || argv.to || 'now';

  const to = datemath.parse(String(timeTo))!.valueOf();
  const from = datemath.parse(String(timeFrom))!.valueOf();

  return { from, to };
}

/**
 * Set up failure store infrastructure (templates and pipelines) for failed documents.
 * This matches the setup in failed_logs.ts scenario.
 */
async function setupFailureStoreInfrastructure(
  logsEsClient: any,
  logger: any,
  datasets: Set<string>
): Promise<void> {
  const { IndexTemplateName } = await import('../lib/logs/custom_logsdb_index_templates');

  try {
    // Create NoFailureStore template (lower priority, no failure store)
    // This ensures other indices don't get failure store
    await logsEsClient.createIndexTemplate(IndexTemplateName.NoFailureStore);
    logger.info(`Index template created: ${IndexTemplateName.NoFailureStore}`);

    // Create custom pipeline with fail processors (matching failed_logs.ts)
    const processors = [
      {
        fail: {
          if: "ctx['log.level'] == null",
          message: 'Log level is required',
        },
      },
      {
        script: {
          tag: 'normalize log level',
          lang: 'painless',
          source: `
            String level = ctx['log.level'];
            if ('0'.equals(level)) {
              ctx['log.level'] = 'info';
            } else if ('1'.equals(level)) {
              ctx['log.level'] = 'debug';
            } else if ('2'.equals(level)) {
              ctx['log.level'] = 'warning';
            } else if ('3'.equals(level)) {
              ctx['log.level'] = 'error';
            } else {
              throw new Exception("Not a valid log level");
            }
          `,
        },
      },
    ];

    const pipelineId = `${IndexTemplateName.SomeFailureStore}@pipeline`;
    await logsEsClient.createCustomPipeline(processors, pipelineId);
    logger.info(`Custom pipeline created: ${pipelineId}`);

    // Create failure store templates for each dataset pattern
    // Use priority 501 (higher than NoFailureStore's 500) to ensure they take precedence
    for (const dataset of datasets) {
      // Create a template name based on dataset
      const templateName =
        dataset === '*'
          ? IndexTemplateName.SomeFailureStore
          : `synth.fs.${dataset.replace(/\./g, '-')}`;
      const indexPattern = dataset === '*' ? 'logs-*' : `logs-${dataset}*`;

      // Check if template already exists
      const templateExists = await logsEsClient.client.indices.existsIndexTemplate({
        name: templateName,
      });

      if (!templateExists) {
        // Create new index template with failure store enabled
        await logsEsClient.client.indices.putIndexTemplate({
          name: templateName,
          _meta: {
            managed: false,
            description: 'Custom index template with failure store enabled for schema executor',
          },
          template: {
            settings: {
              default_pipeline: pipelineId,
            },
            // @ts-expect-error - data_stream_options is not in type but is valid
            data_stream_options: {
              failure_store: {
                enabled: true,
              },
            },
          },
          priority: 501,
          index_patterns: [indexPattern],
          composed_of: ['logs@mappings', 'logs@settings', 'ecs@mappings'],
          allow_auto_create: true,
          data_stream: {
            hidden: false,
          },
        });
        logger.info(`Index template created: ${templateName} (pattern: ${indexPattern})`);
      } else {
        logger.info(`Index template already exists: ${templateName}`);
      }
    }
  } catch (error: any) {
    logger.warn(`Failed to set up failure store infrastructure: ${error.message}`);
    // Don't throw - continue with execution even if setup fails
  }
}

/**
 * Generate custom fields based on configuration.
 * Supports both simple object format and advanced generation config.
 */
function generateCustomFields(
  config: unknown,
  index: number,
  timestamp: number,
  isDegraded: boolean,
  isFailed: boolean
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  // Simple format: just a record of field names to values
  // Check if it's NOT an advanced config (no count, no fields array)
  if (
    typeof config === 'object' &&
    config !== null &&
    !('count' in config) &&
    !('fields' in config) &&
    !('valueType' in config) &&
    !('prefix' in config)
  ) {
    const simpleConfig = config as Record<string, unknown>;
    for (const [key, value] of Object.entries(simpleConfig)) {
      fields[`log.custom.${key}`] = value;
    }
    return fields;
  }

  // Advanced format: generation config
  const advancedConfig = config as {
    count?: number;
    prefix?: string;
    valueType?: 'fixed' | 'random' | 'rotated' | 'dynamic' | 'sequential';
    value?: string | number | boolean | Array<string | number | boolean>;
    valueConfig?: {
      min?: number;
      max?: number;
      stringLength?: number;
      numericOnly?: boolean;
      alternating?: boolean;
      valueTypeSpecific?: 'int' | 'bool' | 'double' | 'string';
      asString?: boolean;
    };
    fieldNames?: string[];
    namespace?: string;
    degradeForFailed?: boolean;
    fields?: Array<{
      name: string;
      valueType?: 'fixed' | 'random' | 'rotated' | 'dynamic' | 'sequential';
      valueTypeSpecific?: 'int' | 'bool' | 'double' | 'string';
      asString?: boolean;
      value?: string | number | boolean | Array<string | number | boolean>;
      valueConfig?: {
        min?: number;
        max?: number;
      };
    }>;
  };

  // If explicit fields are provided, use those instead of count/prefix generation
  if (advancedConfig.fields && advancedConfig.fields.length > 0) {
    const namespace =
      advancedConfig.namespace === undefined || advancedConfig.namespace === null
        ? 'log.custom'
        : advancedConfig.namespace;

    for (const fieldDef of advancedConfig.fields) {
      const fieldName = fieldDef.name;
      const value = generateFieldValue(
        fieldDef.valueType || 'random',
        fieldDef.valueTypeSpecific,
        fieldDef.asString,
        fieldDef.value,
        fieldDef.valueConfig,
        index,
        timestamp,
        isDegraded,
        isFailed,
        degradeForFailed,
        Object.keys(fields).length // Use current field count as offset
      );

      const fullFieldName =
        namespace === ''
          ? fieldName
          : namespace
          ? `${namespace}.${fieldName}`
          : `log.custom.${fieldName}`;
      fields[fullFieldName] = value;
    }

    return fields;
  }

  const count = advancedConfig.count || 1;
  const prefix = advancedConfig.prefix || 'field';
  const valueType = advancedConfig.valueType || 'fixed';
  // namespace handling: undefined/null = use default 'log.custom', empty string '' = no prefix, otherwise use provided
  const namespace =
    advancedConfig.namespace === undefined || advancedConfig.namespace === null
      ? 'log.custom'
      : advancedConfig.namespace;
  const degradeForFailed = advancedConfig.degradeForFailed || false;
  const fieldNames = advancedConfig.fieldNames;

  // Use rotated field names if provided, otherwise generate from prefix
  const generateFieldName = (i: number): string => {
    if (fieldNames && fieldNames.length > 0) {
      return fieldNames[i % fieldNames.length];
    }
    return `${prefix}-${i}`;
  };

  // Generate values based on type
  const generateValue = (i: number): unknown => {
    return generateFieldValue(
      valueType,
      advancedConfig.valueConfig?.valueTypeSpecific,
      advancedConfig.valueConfig?.asString,
      advancedConfig.value,
      advancedConfig.valueConfig,
      index,
      timestamp,
      isDegraded,
      isFailed,
      degradeForFailed,
      i
    );
  };

  // Generate all fields
  for (let i = 0; i < count; i++) {
    const fieldName = generateFieldName(i);
    const value = generateValue(i);
    // Handle namespace: if empty string, use field name directly; if undefined/null, use default; otherwise prepend namespace
    const fullFieldName =
      namespace === ''
        ? fieldName
        : namespace
        ? `${namespace}.${fieldName}`
        : `log.custom.${fieldName}`;
    fields[fullFieldName] = value;
  }

  return fields;
}

/**
 * Generate a field value based on configuration.
 */
function generateFieldValue(
  valueType: 'fixed' | 'random' | 'rotated' | 'dynamic' | 'sequential',
  valueTypeSpecific?: 'int' | 'bool' | 'double' | 'string',
  asString?: boolean,
  value?: string | number | boolean | Array<string | number | boolean>,
  valueConfig?: {
    min?: number;
    max?: number;
    stringLength?: number;
    numericOnly?: boolean;
    alternating?: boolean;
  },
  index: number = 0,
  timestamp: number = 0,
  isDegraded: boolean = false,
  isFailed: boolean = false,
  degradeForFailed: boolean = false,
  fieldIndex: number = 0
): unknown {
  // Handle degraded fields for degraded/ignored documents or failed documents (if degradeForFailed is true)
  // Degraded documents: fields exceed ignore_above limits, documents are indexed but have _ignore property
  // Failed documents with degradeForFailed: fields exceed limits, but documents still fail ingestion
  if (isDegraded || (isFailed && degradeForFailed)) {
    return MORE_THAN_1024_CHARS; // Exceeds ignore_above: 1024 limit
  }

  // Helper to convert value to string if asString is true
  const stringifyIfNeeded = (val: unknown): unknown => {
    if (asString && val !== undefined && val !== null) {
      return String(val);
    }
    return val;
  };

  // Generate type-specific value if specified
  if (valueTypeSpecific) {
    let typedValue: unknown;
    switch (valueTypeSpecific) {
      case 'int': {
        if (valueType === 'fixed' && typeof value === 'number') {
          typedValue = Math.floor(value);
        } else if (valueType === 'fixed' && typeof value === 'string') {
          typedValue = Math.floor(parseFloat(value));
        } else {
          const min = valueConfig?.min ?? 0;
          const max = valueConfig?.max ?? 100;
          typedValue = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        break;
      }
      case 'bool': {
        if (valueType === 'fixed' && typeof value === 'boolean') {
          typedValue = value;
        } else if (valueType === 'fixed' && typeof value === 'string') {
          typedValue = value.toLowerCase() === 'true';
        } else {
          typedValue = Math.random() > 0.5;
        }
        break;
      }
      case 'double': {
        if (valueType === 'fixed' && typeof value === 'number') {
          typedValue = value;
        } else if (valueType === 'fixed' && typeof value === 'string') {
          typedValue = parseFloat(value);
        } else {
          const min = valueConfig?.min ?? 0;
          const max = valueConfig?.max ?? 100;
          typedValue = Math.random() * (max - min) + min;
        }
        break;
      }
      case 'string': {
        if (valueType === 'fixed' && value !== undefined) {
          typedValue = String(value);
        } else {
          const length = valueConfig?.stringLength || 200;
          typedValue = getRandomSlice(MORE_THAN_1024_CHARS, length);
        }
        break;
      }
    }
    return stringifyIfNeeded(typedValue);
  }

  // Generate value based on valueType
  switch (valueType) {
    case 'fixed': {
      if (value === undefined) {
        return stringifyIfNeeded(`value-${fieldIndex}`);
      }
      // For arrays, rotate through values
      if (Array.isArray(value)) {
        const selectedValue = value[fieldIndex % value.length];
        return stringifyIfNeeded(selectedValue);
      }
      return stringifyIfNeeded(value);
    }

    case 'random': {
      const numericOnly = valueConfig?.numericOnly || false;
      const alternating = valueConfig?.alternating || false;

      if (alternating) {
        // Alternate between numeric and string (like logs_traces_hosts.ts)
        if (fieldIndex % 2 === 0) {
          const min = valueConfig?.min ?? 0;
          const max = valueConfig?.max ?? 1000000;
          return stringifyIfNeeded(Math.random() * (max - min) + min);
        } else {
          const length = valueConfig?.stringLength || 200;
          return getRandomSlice(MORE_THAN_1024_CHARS, length);
        }
      } else if (numericOnly) {
        const min = valueConfig?.min ?? 0;
        const max = valueConfig?.max ?? 1000000;
        return stringifyIfNeeded(Math.random() * (max - min) + min);
      } else {
        // Random string
        const length = valueConfig?.stringLength || 200;
        return getRandomSlice(MORE_THAN_1024_CHARS, length);
      }
    }

    case 'rotated': {
      if (Array.isArray(value)) {
        const selectedValue = value[index % value.length];
        return stringifyIfNeeded(selectedValue);
      }
      if (value !== undefined) {
        return stringifyIfNeeded(value);
      }
      return stringifyIfNeeded(`rotated-value-${index % 10}`);
    }

    case 'dynamic': {
      // Compute based on index/timestamp
      return stringifyIfNeeded(`dynamic-${timestamp}-${index}-${fieldIndex}`);
    }

    case 'sequential': {
      return stringifyIfNeeded(fieldIndex);
    }

    default:
      return stringifyIfNeeded(`value-${fieldIndex}`);
  }
}

/**
 * Slices a string from the start index to a random number until length.
 * Similar to logs_traces_hosts.ts scenario helper.
 */
function getRandomSlice(str: string, maxLength: number, startIndex = 0): string {
  const start = Math.min(str.length, startIndex);
  const end = Math.min(str.length, start + Math.floor(Math.random() * maxLength));
  return str.slice(start, end);
}
