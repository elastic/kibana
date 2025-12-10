/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a combination of log documents and APM metrics for several services.
 * Allows customizing the error/failure rate of transactions and log distributions.
 *
 * Usage:
 *   node scripts/synthtrace.js logs_and_metrics_custom_error_rate --live --scenarioOpts='{"errorRate":0.1}'
 *   node scripts/synthtrace.js logs_and_metrics_custom_error_rate --from=now-2h --to=now --scenarioOpts='{"errorRate":0.2,"debugRate":0.3}'
 *
 * Options:
 *   - errorRate: Number between 0 and 1 (default: 0.5 = 50% error rate)
 *     - 0.0 = 0% errors (all successful)
 *     - 0.1 = 10% errors
 *     - 0.5 = 50% errors
 *     - 1.0 = 100% errors (all failures)
 *   - debugRate: Number between 0 and 1 (default: 0 = 0% debug logs)
 *     - The remaining percentage will be info-level logs
 *     - errorRate + debugRate must not exceed 1.0
 *   - numServices: Number of services to generate (default: 3)
 *   - transactionsPerMinute: Total transactions per minute (default: 360)
 *   - logsPerMinute: Override automatic log volume calculation (optional)
 *   - interval: Time interval for rate calculation (default: '1m' = per minute)
 *     - '1s' = per second (better for live mode)
 *     - '1m' = per minute (default)
 *     - '5m' = per 5 minutes
 *   - isLogsDb: Use LogsDB format (default: false)
 *
 * Accuracy Notes:
 *   - The scenario automatically calculates optimal log volume to balance accuracy with performance
 *   - For time ranges, it targets ~10,000 total logs to align with Kibana's default sampling behavior
 *   - Displayed percentages may vary by ±0.1-0.5% due to:
 *     - Kibana's sampling when viewing large datasets
 *     - Rounding when converting percentages to integer log counts
 *     - Statistical variance in random sampling
 *   - For exact percentages, use the GCD-based allocation algorithm which minimizes rounding errors
 *   - Override logsPerMinute manually if you need different volume characteristics
 */

import type { LogDocument, Instance } from '@kbn/synthtrace-client';
import { log, generateShortId, generateLongId, apm } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { getCluster, getCloudRegion, getCloudProvider } from './helpers/logs_mock_data';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// Helper function to find GCD (Greatest Common Divisor)
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Calculate optimal logsPerMinute that can accurately represent the given percentages
function calculateOptimalLogsPerMinute(
  errorRate: number,
  debugRate: number,
  minLogs: number = 1000
): number {
  // Convert rates to fractions (e.g., 0.2 -> 20/100, 0.65 -> 65/100)
  const precision = 10000; // Use high precision to capture decimal rates
  const errorNumerator = Math.round(errorRate * precision);
  const debugNumerator = Math.round(debugRate * precision);
  const infoNumerator = Math.round((1 - errorRate - debugRate) * precision);

  // Find GCD of all numerators with the precision
  let commonGcd = gcd(errorNumerator, precision);
  if (debugNumerator > 0) commonGcd = gcd(commonGcd, debugNumerator);
  if (infoNumerator > 0) commonGcd = gcd(commonGcd, infoNumerator);

  // Simplify fractions
  const simplifiedDenominator = precision / commonGcd;

  // Find smallest multiple of simplifiedDenominator that's >= minLogs
  const multiplier = Math.ceil(minLogs / simplifiedDenominator);
  const optimalLogs = simplifiedDenominator * multiplier;

  // Cap at reasonable maximum (increased for better accuracy)
  return Math.min(optimalLogs, 50000);
}

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  // Extract custom options with defaults
  const numServices = (runOptions.scenarioOpts?.numServices as number) || 3;
  const transactionsPerMinute = (runOptions.scenarioOpts?.transactionsPerMinute as number) || 360;

  // Explicitly convert to number and validate
  // Cap minimum at 1% (0.01) for errorRate and debugRate (if provided)
  const rawErrorRate = runOptions.scenarioOpts?.errorRate;
  const rawDebugRate = runOptions.scenarioOpts?.debugRate;
  const parsedErrorRate =
    typeof rawErrorRate === 'number' ? rawErrorRate : Number(rawErrorRate) || 0.5;
  const parsedDebugRate =
    typeof rawDebugRate === 'number' ? rawDebugRate : Number(rawDebugRate) || 0;

  // Cap minimum at 1% (0.01) - if user provides a value less than 1%, cap it to 1%
  const errorRate = Math.max(0.01, Math.min(1, parsedErrorRate));
  const debugRate = parsedDebugRate > 0 ? Math.max(0.01, Math.min(1, parsedDebugRate)) : 0;
  const interval = (runOptions.scenarioOpts?.interval as string) || '1m';

  // Calculate optimal logsPerMinute for accurate percentage representation
  // Strategy: Balance precision with Kibana's default sampling behavior (~10k records)
  // By targeting total logs near the sampling threshold, we ensure high sample coverage
  // (typically 65-100%), which minimizes statistical variance in displayed percentages
  const calculatedInfoRate = 1.0 - errorRate - debugRate;
  const rates = [errorRate, debugRate, calculatedInfoRate].filter((r) => r > 0);
  const minRate = rates.length > 0 ? Math.min(...rates) : 0.01;

  // Calculate time range duration in minutes to optimize total log count
  const rangeInMinutes = (runOptions.to - runOptions.from) / (1000 * 60);

  // Target 8,000-12,000 total logs to work well with Kibana's 10k sample limit
  // This ensures 65-100% of logs are sampled, minimizing sampling variance
  const targetTotalLogs = 10000;
  const targetLogsPerMinute = Math.ceil(targetTotalLogs / rangeInMinutes);

  // But ensure we have enough logs to represent the percentages accurately
  const minLogsForPercentages = Math.ceil(100 / minRate);
  const minLogsNeeded = Math.max(minLogsForPercentages, 20);

  // Calculate optimal logsPerMinute using GCD-based method for exact percentage representation
  const calculatedLogsPerMinute = calculateOptimalLogsPerMinute(
    errorRate,
    debugRate,
    Math.max(minLogsNeeded, Math.min(targetLogsPerMinute, 1000))
  );

  // Allow override via scenarioOpts
  const logsPerMinute =
    (runOptions.scenarioOpts?.logsPerMinute as number) || calculatedLogsPerMinute;

  // Validate that errorRate + debugRate doesn't exceed 1.0
  if (errorRate + debugRate > 1.0) {
    throw new Error(
      `errorRate (${errorRate}) + debugRate (${debugRate}) cannot exceed 1.0. Remaining logs will be info level.`
    );
  }

  // Calculate success and failure rates based on error rate
  // If interval is not '1m', we need to scale the rate proportionally
  let failedRate: number;
  let successfulRate: number;

  if (interval === '1m') {
    // Direct calculation for per-minute
    // Use floor for failed rate to ensure we never exceed transactionsPerMinute
    failedRate = Math.floor(transactionsPerMinute * errorRate);
    successfulRate = transactionsPerMinute - failedRate;
  } else {
    // For other intervals, calculate based on the interval duration
    // Parse interval (e.g., '1s', '5m', '30s')
    const intervalMatch = interval.match(/(\d+)(s|m|h|d)/);
    if (!intervalMatch) {
      throw new Error(
        `Invalid interval format: ${interval}. Use format like '1s', '1m', '5m', etc.`
      );
    }
    const intervalAmount = Number(intervalMatch[1]);
    const intervalUnit = intervalMatch[2];

    // Convert to minutes for calculation
    let intervalInMinutes = intervalAmount;
    if (intervalUnit === 's') intervalInMinutes = intervalAmount / 60;
    if (intervalUnit === 'h') intervalInMinutes = intervalAmount * 60;
    if (intervalUnit === 'd') intervalInMinutes = intervalAmount * 60 * 24;

    // Scale transactionsPerMinute to the interval
    const transactionsPerInterval = transactionsPerMinute * intervalInMinutes;
    // Use floor for failed rate to ensure we never exceed transactionsPerInterval
    failedRate = Math.floor(transactionsPerInterval * errorRate);
    successfulRate = transactionsPerInterval - failedRate;
  }

  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient, apmEsClient } }) => {
      const { logger } = runOptions;

      const SERVICE_NAMES = Array(numServices)
        .fill(null)
        .map((_, idx) => `synth-service-${idx}`);

      // Generate logs with log levels based on error rate and debug rate
      // Uses the Largest Remainder Method (Hamilton method) for proportional allocation
      // This algorithm ensures:
      //   1. Total logs always equals logsPerMinute exactly
      //   2. Rounding errors are minimized across all log levels
      //   3. Each level receives the fairest possible integer allocation
      // Note: Final displayed percentages may still vary slightly (±0.1-0.5%) due to
      // Kibana's sampling behavior when visualizing large datasets

      // Calculate exact fractional amounts
      const errorExact = logsPerMinute * errorRate;
      const debugExact = logsPerMinute * debugRate;
      const infoExact = logsPerMinute * (1 - errorRate - debugRate);

      // Start with integer parts
      let errorCount = Math.floor(errorExact);
      let debugCount = Math.floor(debugExact);
      let infoCount = Math.floor(infoExact);

      // Calculate remainders
      const errorRemainder = errorExact - errorCount;
      const debugRemainder = debugExact - debugCount;
      const infoRemainder = infoExact - infoCount;

      // Distribute remaining slots based on largest remainders
      const remainingSlots = logsPerMinute - (errorCount + debugCount + infoCount);
      const remainders = [
        { type: 'error', remainder: errorRemainder },
        { type: 'debug', remainder: debugRemainder },
        { type: 'info', remainder: infoRemainder },
      ].sort((a, b) => b.remainder - a.remainder);

      // Allocate remaining slots to types with largest remainders
      for (let i = 0; i < remainingSlots; i++) {
        if (remainders[i].type === 'error') errorCount++;
        else if (remainders[i].type === 'debug') debugCount++;
        else infoCount++;
      }

      // Pre-create the sequence once and reuse it for all time buckets
      // Optimized: Build sequence in a single pass using direct calculation
      const logLevelSequence: Array<'error' | 'debug' | 'info'> = new Array(logsPerMinute).fill(
        'info'
      );

      // Calculate intervals for even distribution
      const errorInterval = errorCount > 0 ? logsPerMinute / errorCount : Infinity;
      const debugInterval = debugCount > 0 ? logsPerMinute / debugCount : Infinity;

      // Track how many of each type we've placed
      let errorsPlaced = 0;
      let debugsPlaced = 0;

      // Single pass: place errors and debug at calculated intervals
      for (let i = 0; i < logsPerMinute; i++) {
        // Check if this position should be an error
        if (errorsPlaced < errorCount) {
          const targetErrorPos = Math.floor((errorsPlaced + 0.5) * errorInterval);
          if (i >= targetErrorPos) {
            logLevelSequence[i] = 'error';
            errorsPlaced++;
            continue;
          }
        }

        // Check if this position should be a debug (only if not already error)
        if (debugsPlaced < debugCount && logLevelSequence[i] === 'info') {
          const targetDebugPos = Math.floor((debugsPlaced + 0.5) * debugInterval);
          if (i >= targetDebugPos) {
            logLevelSequence[i] = 'debug';
            debugsPlaced++;
          }
        }
      }

      // Fill any remaining slots to ensure exact counts (due to rounding)
      for (
        let i = 0;
        i < logsPerMinute && (errorsPlaced < errorCount || debugsPlaced < debugCount);
        i++
      ) {
        if (logLevelSequence[i] === 'info') {
          if (errorsPlaced < errorCount) {
            logLevelSequence[i] = 'error';
            errorsPlaced++;
          } else if (debugsPlaced < debugCount) {
            logLevelSequence[i] = 'debug';
            debugsPlaced++;
          }
        }
      }

      // Validate exact counts to ensure accuracy
      const actualErrorCount = logLevelSequence.filter((level) => level === 'error').length;
      const actualDebugCount = logLevelSequence.filter((level) => level === 'debug').length;
      const actualInfoCount = logLevelSequence.filter((level) => level === 'info').length;

      if (actualErrorCount !== errorCount || actualDebugCount !== debugCount) {
        throw new Error(
          `Log distribution mismatch: expected ${errorCount} errors and ${debugCount} debug, ` +
            `but got ${actualErrorCount} errors and ${actualDebugCount} debug`
        );
      }

      // Log the distribution for verification (only in verbose mode)
      if (logger) {
        logger.debug(
          `Log distribution per minute: ${actualErrorCount} errors (${(
            (actualErrorCount / logsPerMinute) *
            100
          ).toFixed(2)}%), ` +
            `${actualDebugCount} debug (${((actualDebugCount / logsPerMinute) * 100).toFixed(
              2
            )}%), ` +
            `${actualInfoCount} info (${((actualInfoCount / logsPerMinute) * 100).toFixed(2)}%)`
        );
      }

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(logsPerMinute)
            .fill(0)
            .map((_, index) => {
              const serviceIndex = Math.floor(Math.random() * numServices);
              // Use modulo to ensure index is within bounds for cluster/region arrays
              const { clusterId, clusterName } = getCluster(serviceIndex % 3);
              const cloudRegion = getCloudRegion(serviceIndex % 3);

              // Get log level from sequence for this time bucket
              const logLevel = logLevelSequence[index];
              let message: string;

              if (logLevel === 'error') {
                message = MESSAGE_LOG_LEVELS[2].message; // Error message
              } else if (logLevel === 'debug') {
                message = MESSAGE_LOG_LEVELS[1].message; // Debug message
              } else {
                message = MESSAGE_LOG_LEVELS[0].message; // Info message
              }

              return log
                .create({ isLogsDb })
                .message(message)
                .logLevel(logLevel as 'info' | 'debug' | 'error')
                .service(SERVICE_NAMES[serviceIndex])
                .defaults({
                  'trace.id': generateLongId(),
                  'agent.name': 'synth-agent',
                  'orchestrator.cluster.name': clusterName,
                  'orchestrator.cluster.id': clusterId,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': getCloudProvider(),
                  'cloud.region': cloudRegion,
                  'cloud.availability_zone': `${cloudRegion}a`,
                  'cloud.project.id': generateShortId(),
                  'cloud.instance.id': generateShortId(),
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                })
                .timestamp(timestamp);
            });
        });

      // APM Trace with configurable error rate

      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps =
        successfulRate > 0
          ? range.interval(interval).rate(successfulRate)
          : range.interval(interval).rate(0);

      const failedTimestamps =
        failedRate > 0
          ? range.interval(interval).rate(failedRate)
          : range.interval(interval).rate(0);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({ name: SERVICE_NAMES[index], environment: ENVIRONMENT, agentName: 'go' })
          .instance('instance')
      );

      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp),
              instance
                .span({ spanName: 'custom_operation', spanType: 'custom' })
                .duration(100)
                .success()
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                })
                .timestamp(timestamp + 50)
            )
        );

        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [successfulTraceEvents, failedTraceEvents, metricsets];
      };

      return [
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => logs)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () =>
            instances.flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
  };
};

export default scenario;
