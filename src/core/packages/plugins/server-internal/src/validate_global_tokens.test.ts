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
  {
    provides = [],
    consumes = [],
    hosts = [],
    contributes = [],
  }: {
    provides?: string[];
    consumes?: string[];
    hosts?: string[];
    contributes?: string[];
  } = {}
): [string, PluginWrapper] => [
  name,
  {
    name,
    manifest: {
      globals: {
        services: { provides, consumes },
        extensionPoints: { hosts, contributes },
      },
    },
  } as unknown as PluginWrapper,
];

describe('validateGlobalTokens', () => {
  let log: jest.Mocked<Logger>;

  beforeEach(() => {
    log = loggingSystemMock.createLogger();
  });

  it('does nothing when all consumed tokens have publishers', () => {
    const plugins = new Map([
      createPlugin('slo', { provides: ['slo.CreateFlyout'] }),
      createPlugin('apm', { consumes: ['slo.CreateFlyout'] }),
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
      createPlugin('apm', { consumes: ['slo.CreateFlyout', 'slo.DetailsFlyout'] }),
      createPlugin('slo', { provides: ['slo.CreateFlyout'] }),
    ]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('"slo.DetailsFlyout"'));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('"slo" plugin may be disabled'));
  });

  it('throws after logging in error mode', () => {
    const plugins = new Map([
      createPlugin('apm', { consumes: ['slo.CreateFlyout'] }),
      createPlugin('infra', { consumes: ['ml.AnomalyDetection'] }),
    ]);

    expect(() => validateGlobalTokens(plugins, 'error', log)).toThrow(
      /Cross-plugin DI validation failed\. 2 issue\(s\) found/
    );
    expect(log.warn).toHaveBeenCalledTimes(2);
  });

  it('does not throw in warn mode even with violations', () => {
    const plugins = new Map([createPlugin('apm', { consumes: ['slo.CreateFlyout'] })]);

    expect(() => validateGlobalTokens(plugins, 'warn', log)).not.toThrow();
    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  it('includes the expected publisher name from the token prefix', () => {
    const plugins = new Map([createPlugin('dashboard', { consumes: ['lens.EmbeddableFactory'] })]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('"lens" plugin may be disabled'));
  });

  it('allows hosted extension points with no contributions', () => {
    const plugins = new Map([
      createPlugin('embeddable', { hosts: ['embeddable.FactoryRegistration'] }),
    ]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).not.toHaveBeenCalled();
  });

  it('warns when an extension point contribution has no host', () => {
    const plugins = new Map([
      createPlugin('lens', { contributes: ['embeddable.FactoryRegistration'] }),
    ]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('contributes to extension point "embeddable.FactoryRegistration"')
    );
  });

  it('warns when a service has multiple providers', () => {
    const plugins = new Map([
      createPlugin('slo', { provides: ['slo.CreateFlyout'] }),
      createPlugin('sloAlt', { provides: ['slo.CreateFlyout'] }),
    ]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('multiple providers'));
  });

  it('warns when an extension point has multiple hosts', () => {
    const plugins = new Map([
      createPlugin('embeddable', { hosts: ['embeddable.FactoryRegistration'] }),
      createPlugin('dashboard', { hosts: ['embeddable.FactoryRegistration'] }),
    ]);

    validateGlobalTokens(plugins, 'warn', log);

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('multiple hosts'));
  });
});
