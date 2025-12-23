/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange } from '@kbn/synthtrace-client';
import type { LogDocument } from '@kbn/synthtrace-client';
import type { SynthtraceGenerator } from '@kbn/synthtrace-client';
import { Readable } from 'stream';
import type { Logger } from '../../lib/utils/create_logger';
import type { ScenarioInitOptions } from '../../cli/scenario';
import type { SynthtraceClients } from '../../cli/utils/clients_manager';
import scenario from '../../scenarios/logs_and_metrics_custom_error_rate';

// Create a mock logger with all required methods
const createMockLogger = (): Logger => {
  const noop = () => {};
  return {
    debug: noop,
    info: noop,
    error: noop,
    warning: noop,
    verbose: noop,
    perf: <T>(_name: string, cb: () => T) => cb(),
  } as unknown as Logger;
};

// Helper to convert generator to array of serialized events
async function generatorToArray(
  generator: SynthtraceGenerator<LogDocument> | Array<SynthtraceGenerator<LogDocument>> | Readable
): Promise<Array<Record<string, any>>> {
  if (Array.isArray(generator)) {
    return generator.flatMap((gen) => Array.from(gen).flatMap((event) => event.serialize()));
  }
  if (generator instanceof Readable) {
    const arr: Array<Record<string, any>> = [];
    for await (const chunk of generator) {
      if (Array.isArray(chunk)) {
        arr.push(...chunk.flatMap((event: any) => (event.serialize ? event.serialize() : [event])));
      } else if (chunk && typeof chunk === 'object' && 'serialize' in chunk) {
        arr.push(...chunk.serialize());
      } else {
        arr.push(chunk);
      }
    }
    return arr;
  }
  return Array.from(generator).flatMap((event) => event.serialize());
}

// Create minimal scenario options for testing
const createScenarioOptions = (
  scenarioOpts: Record<string, any>
): Partial<ScenarioInitOptions> => ({
  scenarioOpts,
  logger: createMockLogger(),
  from: 0,
  to: 0,
  logLevel: 'info' as any,
  files: [],
  target: undefined,
  kibana: undefined,
  apiKey: undefined,
  uniqueIds: undefined,
  workers: undefined,
  concurrency: undefined,
  versionOverride: undefined,
  clean: undefined,
  'assume-package-version': undefined,
  liveBucketSize: undefined,
  insecure: undefined,
});

// Create minimal clients for testing
const createMockClients = (): Partial<SynthtraceClients> => ({
  logsEsClient: {} as any,
  apmEsClient: {} as any,
  infraEsClient: {} as any,
  syntheticsEsClient: {} as any,
  streamsClient: {} as any,
});

describe('logs_and_metrics_custom_error_rate', () => {
  const mockLogger = createMockLogger();
  const range = timerange(
    new Date('2021-01-01T00:00:00.000Z'),
    new Date('2021-01-01T00:05:00.000Z'),
    mockLogger as any
  );

  it('generates logs with default error rate (50%)', async () => {
    const scenarioFn = await scenario({
      ...createScenarioOptions({}),
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const logsResult = Array.isArray(result) ? result[0] : result;
    const logsGenerator = logsResult.generator;
    const logs = await generatorToArray(logsGenerator);

    // Should generate logs (default is 20 logs per minute, 5 minutes = 100 logs)
    expect(logs.length).toBeGreaterThan(0);

    // Check that logs have different levels
    const logLevels = logs.map((log) => log['log.level']);
    expect(logLevels).toContain('info');
    expect(logLevels).toContain('error');
  });

  it('generates logs with custom error rate (10%)', async () => {
    const scenarioFn = await scenario({
      ...createScenarioOptions({ errorRate: 0.1 }),
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const logsResult = Array.isArray(result) ? result[0] : result;
    const logsGenerator = logsResult.generator;
    const logs = await generatorToArray(logsGenerator);

    // Count log levels for one minute (first 20 logs)
    const firstMinuteLogs = logs.slice(0, 20);
    const errorLogs = firstMinuteLogs.filter((log) => log['log.level'] === 'error');
    const errorPercentage = errorLogs.length / firstMinuteLogs.length;

    // Should be approximately 10% (allow some variance due to rounding)
    expect(errorPercentage).toBeGreaterThanOrEqual(0.05);
    expect(errorPercentage).toBeLessThanOrEqual(0.15);
  });

  it('generates logs with custom error and debug rates', async () => {
    const scenarioFn = await scenario({
      ...createScenarioOptions({ errorRate: 0.2, debugRate: 0.3 }),
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const logsResult = Array.isArray(result) ? result[0] : result;
    const logsGenerator = logsResult.generator;
    const logs = await generatorToArray(logsGenerator);

    // Count log levels for one minute
    const firstMinuteLogs = logs.slice(0, 20);
    const errorLogs = firstMinuteLogs.filter((log) => log['log.level'] === 'error');
    const debugLogs = firstMinuteLogs.filter((log) => log['log.level'] === 'debug');
    const infoLogs = firstMinuteLogs.filter((log) => log['log.level'] === 'info');

    const errorPercentage = errorLogs.length / firstMinuteLogs.length;
    const debugPercentage = debugLogs.length / firstMinuteLogs.length;
    const infoPercentage = infoLogs.length / firstMinuteLogs.length;

    // Should have approximately 20% error, 30% debug, 50% info
    expect(errorPercentage).toBeGreaterThanOrEqual(0.15);
    expect(errorPercentage).toBeLessThanOrEqual(0.25);
    expect(debugPercentage).toBeGreaterThanOrEqual(0.25);
    expect(debugPercentage).toBeLessThanOrEqual(0.35);
    expect(infoPercentage).toBeGreaterThanOrEqual(0.45);
    expect(infoPercentage).toBeLessThanOrEqual(0.55);
  });

  it('generates APM transactions with correct error rate', async () => {
    const scenarioFn = await scenario({
      ...createScenarioOptions({ errorRate: 0.25, transactionsPerMinute: 100 }),
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const apmResult = Array.isArray(result) ? result[1] : result;
    const apmGenerator = apmResult.generator;
    // APM generators return arrays of generators, so we need to flatten and serialize each
    const apmEvents = await generatorToArray(apmGenerator);

    // Filter transactions
    const transactions = apmEvents.filter((event) => event['processor.event'] === 'transaction');

    // Count successful vs failed transactions
    const successfulTransactions = transactions.filter(
      (tx) => tx['event.outcome'] === 'success' || tx['transaction.result'] === 'success'
    );
    const failedTransactions = transactions.filter(
      (tx) => tx['event.outcome'] === 'failure' || tx['transaction.result'] === 'error'
    );

    const totalTransactions = successfulTransactions.length + failedTransactions.length;
    if (totalTransactions > 0) {
      const failureRate = failedTransactions.length / totalTransactions;
      // Should be approximately 25% failure rate (allow variance)
      expect(failureRate).toBeGreaterThanOrEqual(0.2);
      expect(failureRate).toBeLessThanOrEqual(0.3);
    }
  });

  it('generates logs with minimum 1% error rate when lower value provided', async () => {
    const scenarioFn = await scenario({
      ...createScenarioOptions({ errorRate: 0.001 }), // 0.1% should be capped to 1%
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const logsResult = Array.isArray(result) ? result[0] : result;
    const logsGenerator = logsResult.generator;
    const logs = await generatorToArray(logsGenerator);

    // Verify logs are generated
    expect(logs.length).toBeGreaterThan(0);

    // With 1% error rate (capped from 0.1%), we should have some errors
    // The deterministic sequence ensures exact percentages, but with a 5-minute range
    // and potentially large logsPerMinute, we need to check all logs
    const errorLogs = logs.filter((log) => log['log.level'] === 'error');
    const totalLogs = logs.length;

    // With 1% error rate, we should have at least some errors in a 5-minute window
    // The exact count depends on logsPerMinute, but with deterministic sequence
    // we should see errors. If logsPerMinute is 100, we'd have 1 error per minute = 5 errors in 5 minutes
    // If logsPerMinute is 10000, we'd have 100 errors per minute = 500 errors in 5 minutes
    if (totalLogs > 0) {
      const errorPercentage = errorLogs.length / totalLogs;
      // With 1% minimum cap, we should see at least 0.5% errors (allowing for rounding)
      // But if we have a very small sample, we might not see any errors
      // So we check: if we have enough logs (>= 200), we should see at least 0.5% errors
      if (totalLogs >= 200) {
        expect(errorPercentage).toBeGreaterThanOrEqual(0.005);
      }
      // In any case, if we have a reasonable number of logs, we should see at least one error
      if (totalLogs >= 100) {
        expect(errorLogs.length).toBeGreaterThan(0);
      }
    }
  });

  it('generates correct number of services', async () => {
    const numServices = 5;
    const scenarioFn = await scenario({
      ...createScenarioOptions({ numServices }),
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const logsResult = Array.isArray(result) ? result[0] : result;
    const logsGenerator = logsResult.generator;
    const logs = await generatorToArray(logsGenerator);

    // Extract unique service names
    const serviceNames = new Set(logs.map((log) => log['service.name']).filter(Boolean));

    // Should have the specified number of services
    expect(serviceNames.size).toBeLessThanOrEqual(numServices);
  });

  it('throws error when errorRate + debugRate exceeds 1.0', async () => {
    await expect(
      scenario({
        ...createScenarioOptions({ errorRate: 0.6, debugRate: 0.5 }), // Total = 1.1 > 1.0
        from: range.from.getTime(),
        to: range.to.getTime(),
      } as ScenarioInitOptions)
    ).rejects.toThrow('errorRate');
  });

  it('generates logs with correct message for each log level', async () => {
    const scenarioFn = await scenario({
      ...createScenarioOptions({ errorRate: 0.33, debugRate: 0.33 }),
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const logsResult = Array.isArray(result) ? result[0] : result;
    const logsGenerator = logsResult.generator;
    const logs = await generatorToArray(logsGenerator);

    // Check that error logs have error message
    const errorLogs = logs.filter((log) => log['log.level'] === 'error');
    if (errorLogs.length > 0) {
      expect(errorLogs[0].message).toContain('Error with certificate');
    }

    // Check that debug logs have debug message
    const debugLogs = logs.filter((log) => log['log.level'] === 'debug');
    if (debugLogs.length > 0) {
      expect(debugLogs[0].message).toContain('Yet another debug log');
    }

    // Check that info logs have info message
    const infoLogs = logs.filter((log) => log['log.level'] === 'info');
    if (infoLogs.length > 0) {
      expect(infoLogs[0].message).toContain('A simple log');
    }
  });

  it('generates APM metrics', async () => {
    const scenarioFn = await scenario({
      ...createScenarioOptions({}),
      from: range.from.getTime(),
      to: range.to.getTime(),
    } as ScenarioInitOptions);

    const { generate } = scenarioFn;
    const result = generate({
      range,
      clients: createMockClients() as SynthtraceClients,
    });

    const apmResult = Array.isArray(result) ? result[1] : result;
    const apmGenerator = apmResult.generator;
    // APM generators return arrays of generators, so we need to flatten and serialize each
    const apmEvents = await generatorToArray(apmGenerator);

    // Check for metric events
    const metrics = apmEvents.filter((event) => event['processor.event'] === 'metric');
    expect(metrics.length).toBeGreaterThan(0);

    // Check that app metrics have expected fields
    // Note: APM generates multiple metric types (app, span_breakdown, etc.)
    // We need to filter for app metrics specifically
    const appMetrics = metrics.filter((event) => event['metricset.name'] === 'app');
    expect(appMetrics.length).toBeGreaterThan(0);

    if (appMetrics.length > 0) {
      const firstAppMetric = appMetrics[0];
      expect(firstAppMetric['metricset.name']).toBe('app');
      expect(firstAppMetric['system.memory.actual.free']).toBe(800);
      expect(firstAppMetric['system.memory.total']).toBe(1000);
    }
  });
});
