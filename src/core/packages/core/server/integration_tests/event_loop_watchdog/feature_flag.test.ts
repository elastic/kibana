/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, of } from 'rxjs';
import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { FeatureFlagsService } from '@kbn/core-feature-flags-server-internal';
import { EventLoopWatchdogService, opsConfig } from '@kbn/core-metrics-server-internal';
import { ServiceStatusLevels } from '@kbn/core-status-common';

const STARTED = /^Event loop watchdog started/;

/**
 * Resolves the flag through Core's real FeatureFlagsService, where `feature_flags.overrides` wins
 * over the fallback, `ops.eventLoopWatchdog.enabled`.
 */
describe('event loop watchdog feature flag', () => {
  let featureFlagsConfig$: BehaviorSubject<{ overrides: Record<string, unknown> }>;
  let featureFlags: FeatureFlagsService;
  let watchdog: EventLoopWatchdogService;
  let logger: ReturnType<typeof loggingSystemMock.create>;

  const infoLogLines = () =>
    loggingSystemMock.collect(logger).info.map(([message]) => String(message));
  const waitFor = async (check: () => boolean, timeoutMs = 30_000) => {
    const end = Date.now() + timeoutMs;
    while (!check()) {
      if (Date.now() > end) {
        throw new Error('Timed out');
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };
  // The "log lines are off" warning is expected: this test's logging config has no console appender.
  const toggleProblems = () => {
    const { warn, error } = loggingSystemMock.collect(logger);
    return [...warn.filter(([message]) => String(message).includes('toggle')), ...error];
  };
  const started = () => infoLogLines().some((line) => STARTED.test(line));
  const setOverride = (enabled?: boolean) =>
    featureFlagsConfig$.next({
      overrides: enabled === undefined ? {} : { 'core.eventLoopWatchdog.enabled': enabled },
    });

  const start = async ({ enabled, override }: { enabled: boolean; override?: boolean }) => {
    featureFlagsConfig$ = new BehaviorSubject({ overrides: {} });
    setOverride(override);
    const ops = opsConfig.schema.validate({ cGroupOverrides: {}, eventLoopWatchdog: { enabled } });
    const configService = configServiceMock.create();
    configService.atPath.mockImplementation((path) => {
      if (path === 'feature_flags') return featureFlagsConfig$;
      if (path === 'ops') return of(ops);
      // Worker log lines off, so the test output stays clean.
      return of({
        root: { appenders: ['file'] },
        appenders: new Map([['file', { type: 'file' }]]),
      });
    });
    const coreContext = mockCoreContext.create({ logger, configService });

    featureFlags = new FeatureFlagsService(coreContext);
    featureFlags.setup({ http: httpServiceMock.createInternalSetupContract() });
    watchdog = new EventLoopWatchdogService(coreContext);
    await watchdog.setup({
      status: { overall$: of({ level: ServiceStatusLevels.available, summary: '' }) },
      nodeRoles: ['ui'],
      serviceVersion: 'test',
    });
    watchdog.start({ featureFlags: featureFlags.start() });
  };

  beforeEach(() => {
    logger = loggingSystemMock.create();
  });
  afterEach(async () => {
    await watchdog.stop();
    await featureFlags.stop();
  });

  it('starts with enabled: true and no override', async () => {
    await start({ enabled: true });
    await waitFor(() => infoLogLines().some((line) => STARTED.test(line)));
  });

  // Each "doesn't start" case ends by starting, which shows the flag was being evaluated.
  it('does not start with enabled: false and no override', async () => {
    await start({ enabled: false });
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(started()).toBe(false);

    setOverride(true);
    await waitFor(started);
    expect(toggleProblems()).toEqual([]);
  });

  it('lets an override of false win over enabled: true', async () => {
    await start({ enabled: true, override: false });
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(started()).toBe(false);

    // Without the override, enabled: true applies.
    setOverride();
    await waitFor(started);
    expect(toggleProblems()).toEqual([]);
  });

  it('starts and stops when the override changes at runtime', async () => {
    await start({ enabled: false });
    setOverride(true);
    await waitFor(() => infoLogLines().some((line) => STARTED.test(line)));
    setOverride(false);
    await waitFor(() => infoLogLines().includes('Event loop watchdog stopped'));
  });
});
