/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { validateGlobalTokens } from './validate_global_tokens';
import type { PluginWrapper } from './plugin';

const createPlugin = (
  name: string,
  provides: string[] = [],
  consumes: string[] = []
): [string, PluginWrapper] => [
  name,
  { manifest: { globals: { provides, consumes } } } as unknown as PluginWrapper,
];

describe('validateGlobalTokens', () => {
  let log: jest.Mocked<Logger>;

  beforeEach(() => {
    log = loggingSystemMock.createLogger();
  });

  it('does nothing when all consumed tokens have publishers', () => {
    const plugins = new Map([
      createPlugin('slo', ['slo.CreateFlyout']),
      createPlugin('apm', [], ['slo.CreateFlyout']),
    ]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).not.toHaveBeenCalled();
  });

  it('does nothing when there are no globals declared', () => {
    const plugins = new Map([createPlugin('slo'), createPlugin('apm')]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).not.toHaveBeenCalled();
  });

  it('logs a warning for each consumed token with no publisher in warn mode', () => {
    const plugins = new Map([
      createPlugin('apm', [], ['slo.CreateFlyout', 'slo.DetailsFlyout']),
      createPlugin('slo', ['slo.CreateFlyout']),
    ]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('"slo.DetailsFlyout"')
    );
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('"slo" plugin may be disabled')
    );
  });

  it('throws after logging in error mode', () => {
    const plugins = new Map([
      createPlugin('apm', [], ['slo.CreateFlyout']),
      createPlugin('infra', [], ['ml.AnomalyDetection']),
    ]);

    expect(() => validateGlobalTokens(plugins, 'error', log)).toThrow(
      /Global DI token validation failed\. 2 consumed token\(s\) have no provider/
    );
    expect(log.warn).toHaveBeenCalledTimes(2);
  });

  it('does not throw in warn mode even with violations', () => {
    const plugins = new Map([createPlugin('apm', [], ['slo.CreateFlyout'])]);

    expect(() => validateGlobalTokens(plugins, 'warn', log)).not.toThrow();
    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  it('includes the expected publisher name from the token prefix', () => {
    const plugins = new Map([createPlugin('dashboard', [], ['lens.EmbeddableFactory'])]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('"lens" plugin may be disabled')
    );
  });
});
