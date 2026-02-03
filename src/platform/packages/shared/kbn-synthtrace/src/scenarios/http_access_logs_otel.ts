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
import type { OtelLogDocument } from '@kbn/synthtrace-client';
import { otelLog } from '@kbn/synthtrace-client';
import type { LogDocument } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { parseHttpAccessLogsOpts } from './helpers/http_access_logs_opts_parser';
import { getGeneratorForPattern, TrafficPattern } from './helpers/http_access_logs_data_generator';
import { estimateDataGeneration } from './helpers/http_generation_estimator';
import { convertEcsToOtel } from './helpers/ecs_to_otel';

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

  // Display generation summary
  logger.info(
    `Generating HTTP Access Logs (OTEL): ${formatDuration(timeRangeMs)} | mode=${
      finalOpts.mode
    } | scale=${scale}x`
  );
  logger.info(
    `Expected output: ${estimate.estimatedDocs.toLocaleString()} docs (~${
      estimate.estimatedSizeMB >= 1024
        ? `${(estimate.estimatedSizeMB / 1024).toFixed(2)} GB`
        : `${estimate.estimatedSizeMB} MB`
    }) | ${cpuCores} CPU cores available`
  );

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
 * Create OTEL log from ECS data using the conversion helper.
 * This is a thin wrapper that delegates to the reusable ECS->OTEL converter.
 */
function createOTELLog(
  logData: Partial<LogDocument>,
  timestamp: number
): ReturnType<typeof otelLog.createForIndex> {
  // Convert ECS to OTEL format using the reusable helper
  const { resourceAttributes, logAttributes, severity, message } = convertEcsToOtel(logData);

  // Create OTEL log with converted attributes
  return otelLog
    .createForIndex('logs-generic.otel-default')
    .message(message)
    .logLevel(severity.text)
    .addResourceAttributes(resourceAttributes)
    .addAttributes(logAttributes)
    .timestamp(timestamp);
}

export default scenario;
