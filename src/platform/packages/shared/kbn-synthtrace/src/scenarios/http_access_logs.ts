/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * HTTP Access Logs Generator (ECS Format)
 *
 * Generates comprehensive, realistic HTTP access logs in ECS format for marketing demonstrations.
 * Supports multiple traffic patterns, extended field coverage, and data quality edge cases.
 *
 * Usage:
 *   node scripts/synthtrace http_access_logs.ts --from=now-1h --to=now --scenarioOpts.scale=1
 *   node scripts/synthtrace http_access_logs.ts --from=now-1d --to=now --scenarioOpts.scale=10
 *   node scripts/synthtrace http_access_logs.ts --from=now-7d --to=now --scenarioOpts.scale=50
 *   node scripts/synthtrace http_access_logs.ts --live --scenarioOpts.scale=10
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
 *   --scenarioOpts.logsdb=BOOL     Use LogsDB format (default: false)
 */

import os from 'os';
import type { LogDocument } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { parseHttpAccessLogsOpts } from './helpers/http_access_logs_opts_parser';
import { getGeneratorForPattern, TrafficPattern } from './helpers/http_access_logs_data_generator';
import { estimateDataGeneration } from './helpers/http_generation_estimator';

const scenario: Scenario<LogDocument> = async (runOptions) => {
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
    `Generating HTTP Access Logs (ECS): ${formatDuration(timeRangeMs)} | mode=${
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
    bootstrap: async ({ logsEsClient }) => {
      if (finalOpts.isLogsDb) {
        await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
        logger.info('LogsDB index template created');
      }
    },

    teardown: async ({ logsEsClient }) => {
      if (finalOpts.isLogsDb) {
        await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
        logger.info('LogsDB index template deleted');
      }
    },

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
          // Use mixed traffic for comprehensive mode
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
              createECSLog(
                getGeneratorForPattern(TrafficPattern.NORMAL)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // Health checks (20%)
        streams.push(
          range
            .interval('5s')
            .rate(20 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.HEALTH_CHECK)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // Good bots (8%)
        streams.push(
          range
            .interval('15s')
            .rate(8 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.GOOD_BOT)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // Redirects (8%)
        streams.push(
          range
            .interval('15s')
            .rate(8 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.REDIRECT)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // Bad bots (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.BAD_BOT)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // OAuth (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.OAUTH)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // CORS (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.CORS)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // Heavy traffic (5%)
        streams.push(
          range
            .interval('20s')
            .rate(5 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.HEAVY)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // Attack traffic (3%)
        streams.push(
          range
            .interval('30s')
            .rate(3 * finalOpts.attackVolume)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.ATTACK)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // Error traffic (3%)
        streams.push(
          range
            .interval('30s')
            .rate(3 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.ERROR)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );

        // WebSocket (1%)
        streams.push(
          range
            .interval('60s')
            .rate(1 * scale)
            .generator((timestamp) =>
              createECSLog(
                getGeneratorForPattern(TrafficPattern.WEBSOCKET)(),
                timestamp,
                finalOpts.isLogsDb
              )
            )
        );
      } else if (finalOpts.mode === 'attack') {
        // Attack mode: higher attack volume
        streams.push(
          range
            .interval('5s')
            .rate(finalOpts.attackVolume)
            .generator((timestamp) =>
              createECSLog(trafficGenerator(), timestamp, finalOpts.isLogsDb)
            )
        );
      } else {
        // Single mode: normal, error, heavy
        streams.push(
          range
            .interval('10s')
            .rate(100 * scale)
            .generator((timestamp) =>
              createECSLog(trafficGenerator(), timestamp, finalOpts.isLogsDb)
            )
        );
      }

      return withClient(
        logsEsClient,
        logger.perf('generating_http_access_logs_ecs', () => streams)
      );
    },
  };
};

/**
 * Create an ECS-formatted log entry from generated data.
 */
function createECSLog(
  logData: Partial<LogDocument>,
  timestamp: number,
  isLogsDb: boolean
): ReturnType<typeof log.create> {
  return log
    .create({ isLogsDb })
    .dataset('http.access')
    .namespace('default')
    .message(
      logData.message ||
        `${logData['http.request.method']} ${logData['url.path']} ${logData['http.response.status_code']}`
    )
    .logLevel(logData['log.level'] || 'info')
    .defaults(logData)
    .timestamp(timestamp);
}

export default scenario;
