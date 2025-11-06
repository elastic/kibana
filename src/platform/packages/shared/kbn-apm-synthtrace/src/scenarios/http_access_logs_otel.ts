/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * HTTP Access Logs Generator (OTEL Format)
 *
 * Generates comprehensive, realistic HTTP access logs in OpenTelemetry format for marketing demonstrations.
 * Supports multiple traffic patterns, extended field coverage, and data quality edge cases.
 *
 * Usage:
 *   node scripts/synthtrace http_access_logs_otel.ts --from=now-1h --to=now --scenarioOpts.scale=1
 *   node scripts/synthtrace http_access_logs_otel.ts --from=now-1d --to=now --scenarioOpts.scale=10
 *   node scripts/synthtrace http_access_logs_otel.ts --from=now-7d --to=now --scenarioOpts.scale=50
 *   node scripts/synthtrace http_access_logs_otel.ts --live --scenarioOpts.scale=10
 *
 * ⚠️  WARNING: Large scale values (100+) and long time ranges (7+ days) can generate
 *     hundreds of millions of documents and may take hours to complete!
 *     Always start with small values and scale up as needed.
 *
 * Options:
 *   --scenarioOpts.scale=N         Scale multiplier (default: 1)
 *   --scenarioOpts.mode=TYPE       Traffic mode: normal|attack|error|heavy|comprehensive|mixed (default: normal)
 *   --scenarioOpts.errorRate=N     Error rate for normal mode (0.0-1.0, default: 0.05)
 *   --scenarioOpts.attackVolume=N  Attack volume multiplier (default: 50)
 */

import os from 'os';
import type { OtelLogDocument } from '@kbn/apm-synthtrace-client';
import { otelLog } from '@kbn/apm-synthtrace-client';
import type { LogDocument } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { parseHttpAccessLogsOpts } from './helpers/http_access_logs_opts_parser';
import { getGeneratorForPattern, TrafficPattern } from './helpers/http_access_logs_data_generator';
import { estimateDataGeneration } from './helpers/http_generation_estimator';

const scenario: Scenario<OtelLogDocument> = async (runOptions) => {
  const parsedOpts = parseHttpAccessLogsOpts(runOptions.scenarioOpts);
  const { logger } = runOptions;

  // Use safe default scale (no auto-scaling)
  const scale = parsedOpts.scale;
  const finalOpts = {
    ...parsedOpts,
    scale,
  };

  // Calculate and display generation estimates
  const timeRangeMs = runOptions.to - runOptions.from;
  const estimate = estimateDataGeneration({
    fromMs: runOptions.from,
    toMs: runOptions.to,
    scale,
    docsPerSecond: finalOpts.mode === 'mixed' || finalOpts.mode === 'comprehensive' ? 100 : 100,
  });

  const cpuCores = os.cpus().length;

  // Format duration nicely
  const formatDuration = (ms: number): string => {
    const seconds = ms / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days >= 1) return `${days.toFixed(1)} days`;
    if (hours >= 1) return `${hours.toFixed(1)} hours`;
    if (minutes >= 1) return `${minutes.toFixed(1)} minutes`;
    return `${seconds.toFixed(0)} seconds`;
  };

  // Display estimation warning
  logger.info('');
  logger.info('='.repeat(80));
  logger.info('⚠️  HTTP ACCESS LOGS GENERATION ESTIMATE (OTEL Format)');
  logger.info('='.repeat(80));
  logger.info(
    `Time Range:       ${formatDuration(timeRangeMs)} (${new Date(
      runOptions.from
    ).toISOString()} to ${new Date(runOptions.to).toISOString()})`
  );
  logger.info(`Mode:             ${finalOpts.mode}`);
  logger.info(`Scale:            ${scale}x`);
  logger.info(`Expected Docs:    ${estimate.estimatedDocs.toLocaleString()}`);
  logger.info(
    `Expected Size:    ${
      estimate.estimatedSizeMB >= 1024
        ? `${(estimate.estimatedSizeMB / 1024).toFixed(2)} GB`
        : `${estimate.estimatedSizeMB} MB`
    }`
  );
  logger.info(`System CPU Cores: ${cpuCores}`);
  logger.info('');
  logger.info('ℹ️  Synthtrace will automatically parallelize generation across multiple workers');
  logger.info('   based on the time range. Each worker handles a portion of the timeline.');
  logger.info('='.repeat(80));

  // Provide recommendations for different scale levels
  if (estimate.estimatedDocs > 100_000_000) {
    logger.info('');
    logger.info('🚨 VERY LARGE DATASET DETECTED (100M+ documents)');
    logger.info('   This may impact system performance!');
    logger.info('   Consider: --scenarioOpts.scale=10 or shorter time range');
    logger.info('');
  } else if (estimate.estimatedDocs > 10_000_000) {
    logger.info('');
    logger.info('⚠️  LARGE DATASET (10M+ documents)');
    logger.info('   For quick testing, use --scenarioOpts.scale=1');
    logger.info('');
  } else if (estimate.estimatedDocs < 100_000) {
    logger.info('');
    logger.info('✅ Small dataset - Good for quick testing!');
    logger.info('   For more realistic demos, consider: --scenarioOpts.scale=10');
    logger.info('');
  }

  logger.info('💡 Recommended scales for different use cases:');
  logger.info('   • Quick test/development: --scenarioOpts.scale=1');
  logger.info('   • Demo/presentation:      --scenarioOpts.scale=10');
  logger.info('   • Benchmarking:           --scenarioOpts.scale=100');
  logger.info('   • Large dataset (1TB+):   --scenarioOpts.scale=5000 --from=now-30d');
  logger.info('='.repeat(80));
  logger.info('');

  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      // Select traffic generator based on mode
      let trafficGenerator;
      switch (finalOpts.mode) {
        case 'normal':
          trafficGenerator = getGeneratorForPattern(TrafficPattern.NORMAL);
          break;
        case 'attack':
          trafficGenerator = getGeneratorForPattern(TrafficPattern.ATTACK);
          break;
        case 'error':
          trafficGenerator = getGeneratorForPattern(TrafficPattern.ERROR);
          break;
        case 'heavy':
          trafficGenerator = getGeneratorForPattern(TrafficPattern.HEAVY);
          break;
        case 'comprehensive':
        case 'mixed':
          trafficGenerator = getGeneratorForPattern(TrafficPattern.NORMAL); // Will be overridden below
          break;
        default:
          trafficGenerator = getGeneratorForPattern(TrafficPattern.NORMAL);
      }

      // Generate traffic streams based on mode
      const streams: any[] = [];

      if (finalOpts.mode === 'comprehensive' || finalOpts.mode === 'mixed') {
        // Mixed mode: all traffic patterns with realistic distribution

        // Normal traffic (37%)
        streams.push(
          range
            .interval('10s')
            .rate(37 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.NORMAL)(), timestamp)
            )
        );

        // Health checks (20%)
        streams.push(
          range
            .interval('5s')
            .rate(20 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.HEALTH_CHECK)(), timestamp)
            )
        );

        // Good bots (8%)
        streams.push(
          range
            .interval('15s')
            .rate(8 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.GOOD_BOT)(), timestamp)
            )
        );

        // Redirects (8%)
        streams.push(
          range
            .interval('15s')
            .rate(8 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.REDIRECT)(), timestamp)
            )
        );

        // Bad bots (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.BAD_BOT)(), timestamp)
            )
        );

        // OAuth (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.OAUTH)(), timestamp)
            )
        );

        // CORS (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.CORS)(), timestamp)
            )
        );

        // Heavy traffic (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.HEAVY)(), timestamp)
            )
        );

        // Attack traffic (3%)
        streams.push(
          range
            .interval('30s')
            .rate(3 * finalOpts.attackVolume)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.ATTACK)(), timestamp)
            )
        );

        // Error traffic (3%)
        streams.push(
          range
            .interval('30s')
            .rate(3 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.ERROR)(), timestamp)
            )
        );

        // WebSocket (1%)
        streams.push(
          range
            .interval('60s')
            .rate(1 * scale)
            .generator((timestamp) =>
              createOTELLog(getGeneratorForPattern(TrafficPattern.WEBSOCKET)(), timestamp)
            )
        );
      } else if (finalOpts.mode === 'attack') {
        // Attack mode: higher attack volume
        streams.push(
          range
            .interval('5s')
            .rate(finalOpts.attackVolume)
            .generator((timestamp) => createOTELLog(trafficGenerator(), timestamp))
        );
      } else {
        // Single mode: normal, error, heavy
        streams.push(
          range
            .interval('10s')
            .rate(100 * scale)
            .generator((timestamp) => createOTELLog(trafficGenerator(), timestamp))
        );
      }

      return withClient(
        logsEsClient,
        logger.perf('generating_http_access_logs_otel', () => streams)
      );
    },
  };
};

/**
 * Map ECS fields to OTEL format.
 * Resource attributes: service, deployment, cloud, kubernetes, container, host
 * Log attributes: http, network, error, correlation, custom fields
 */
function createOTELLog(
  logData: Partial<LogDocument>,
  timestamp: number
): ReturnType<typeof otelLog.createForIndex> {
  // Separate resource attributes (infrastructure/service metadata)
  const resourceAttributes: Record<string, unknown> = {};

  // Service fields
  if (logData['service.name']) resourceAttributes['service.name'] = logData['service.name'];
  if (logData['service.version'])
    resourceAttributes['service.version'] = logData['service.version'];
  if (logData['service.environment'])
    resourceAttributes['service.environment'] = logData['service.environment'];
  if (logData['deployment.name'])
    resourceAttributes['deployment.name'] = logData['deployment.name'];

  // Cloud fields
  if (logData['cloud.provider']) resourceAttributes['cloud.provider'] = logData['cloud.provider'];
  if (logData['cloud.region']) resourceAttributes['cloud.region'] = logData['cloud.region'];
  if (logData['cloud.availability_zone'])
    resourceAttributes['cloud.availability_zone'] = logData['cloud.availability_zone'];
  if (logData['cloud.instance.id'])
    resourceAttributes['cloud.instance.id'] = logData['cloud.instance.id'];
  if (logData['cloud.instance.name'])
    resourceAttributes['cloud.instance.name'] = logData['cloud.instance.name'];
  if (logData['cloud.project.id'])
    resourceAttributes['cloud.project.id'] = logData['cloud.project.id'];

  // Kubernetes fields
  if (logData['kubernetes.namespace'])
    resourceAttributes['k8s.namespace.name'] = logData['kubernetes.namespace'];
  if (logData['kubernetes.pod.name'])
    resourceAttributes['k8s.pod.name'] = logData['kubernetes.pod.name'];
  if (logData['kubernetes.pod.uid'])
    resourceAttributes['k8s.pod.uid'] = logData['kubernetes.pod.uid'];
  if (logData['kubernetes.container.name'])
    resourceAttributes['k8s.container.name'] = logData['kubernetes.container.name'];
  if (logData['kubernetes.deployment.name'])
    resourceAttributes['k8s.deployment.name'] = logData['kubernetes.deployment.name'];
  if (logData['kubernetes.node.name'])
    resourceAttributes['k8s.node.name'] = logData['kubernetes.node.name'];

  // Container fields
  if (logData['container.id']) resourceAttributes['container.id'] = logData['container.id'];
  if (logData['container.name']) resourceAttributes['container.name'] = logData['container.name'];
  if (logData['container.image.name'])
    resourceAttributes['container.image.name'] = logData['container.image.name'];
  if (logData['container.runtime'])
    resourceAttributes['container.runtime'] = logData['container.runtime'];

  // Host fields
  if (logData.hostname) resourceAttributes['host.name'] = logData.hostname;
  if (logData['host.ip']) resourceAttributes['host.ip'] = logData['host.ip'];

  // Separate log attributes (request/response specific data)
  const attributes: Record<string, unknown> = {};

  // HTTP fields
  if (logData['http.request.method']) attributes['http.method'] = logData['http.request.method'];
  if (logData['url.path']) attributes['http.target'] = logData['url.path'];
  if (logData['http.response.status_code'])
    attributes['http.status_code'] = logData['http.response.status_code'];
  if (logData['http.version']) attributes['http.flavor'] = logData['http.version'];
  if (logData['http.response.bytes'])
    attributes['http.response_content_length'] = logData['http.response.bytes'];
  if (logData['user_agent.name']) attributes['http.user_agent'] = logData['user_agent.name'];
  if (logData['http.request.referrer'])
    attributes['http.referer'] = logData['http.request.referrer'];

  // Client/Network fields
  if (logData['client.ip']) attributes['net.peer.ip'] = logData['client.ip'];
  if (logData['network.protocol']) attributes['net.protocol.name'] = logData['network.protocol'];
  if (logData['network.transport']) attributes['net.transport'] = logData['network.transport'];
  if (logData['network.type']) attributes['net.type'] = logData['network.type'];

  // TLS fields
  if (logData['tls.version']) attributes['tls.version'] = logData['tls.version'];
  if (logData['tls.cipher']) attributes['tls.cipher'] = logData['tls.cipher'];

  // Correlation IDs
  if (logData['trace.id']) attributes.trace_id = logData['trace.id'];
  if (logData['span.id']) attributes.span_id = logData['span.id'];
  if (logData['transaction.id']) attributes['transaction.id'] = logData['transaction.id'];
  if (logData['session.id']) attributes['session.id'] = logData['session.id'];

  // Error fields
  if (logData['error.type']) attributes['error.type'] = logData['error.type'];
  if (logData['error.message']) attributes['error.message'] = logData['error.message'];
  if (logData['error.code']) attributes['error.code'] = logData['error.code'];

  // Event fields
  if (logData['event.category']) attributes['event.category'] = logData['event.category'];
  if (logData['event.type']) attributes['event.type'] = logData['event.type'];
  if (logData['event.outcome']) attributes['event.outcome'] = logData['event.outcome'];

  // Tags and labels
  if (logData.tags) attributes.tags = logData.tags;
  if (logData.labels) {
    Object.entries(logData.labels).forEach(([key, value]) => {
      attributes[`label.${key}`] = value;
    });
  }

  // Geo location
  if (logData['host.geo.location']) {
    const [lon, lat] = logData['host.geo.location'];
    attributes['geo.location.lon'] = lon;
    attributes['geo.location.lat'] = lat;
  }

  // Map log level to OTEL severity
  const severityMap: Record<string, { text: string; number: number }> = {
    trace: { text: 'TRACE', number: 1 },
    debug: { text: 'DEBUG', number: 5 },
    info: { text: 'INFO', number: 9 },
    warn: { text: 'WARN', number: 13 },
    warning: { text: 'WARN', number: 13 },
    error: { text: 'ERROR', number: 17 },
    fatal: { text: 'FATAL', number: 21 },
  };

  const logLevel = (logData['log.level'] || 'info').toLowerCase();
  const severity = severityMap[logLevel] || severityMap.info;

  // Create OTEL log
  const otelLogEntry = otelLog
    .createForIndex('logs-generic.otel-default')
    .message(
      logData.message ||
        `${logData['http.request.method']} ${logData['url.path']} ${logData['http.response.status_code']}`
    )
    .logLevel(severity.text)
    .addResourceAttributes(resourceAttributes)
    .addAttributes(attributes)
    .timestamp(timestamp);

  return otelLogEntry;
}

export default scenario;
