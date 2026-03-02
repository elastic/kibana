/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InjectedMetadataPlugin } from '@kbn/core-injected-metadata-common-internal';
import type { DiscoveredPlugin } from '@kbn/core-base-common';
import { PluginType } from '@kbn/core-base-common';
import { validateGlobalTokens } from './validate_global_tokens';

const createPlugin = (
  id: string,
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
): InjectedMetadataPlugin => ({
  id,
  plugin: {
    id,
    type: PluginType.standard,
    configPath: id,
    requiredPlugins: [],
    optionalPlugins: [],
    requiredBundles: [],
    runtimePluginDependencies: [],
    globals: {
      services: { provides, consumes },
      extensionPoints: { hosts, contributes },
    },
  } as DiscoveredPlugin,
});

describe('validateGlobalTokens (browser)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('does nothing when all consumed tokens have publishers', () => {
    const plugins = [
      createPlugin('slo', { provides: ['slo.CreateFlyout'] }),
      createPlugin('apm', { consumes: ['slo.CreateFlyout'] }),
    ];

    validateGlobalTokens(plugins);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does nothing when there are no globals declared', () => {
    const plugins = [createPlugin('slo'), createPlugin('apm')];

    validateGlobalTokens(plugins);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a console.warn for each consumed token with no publisher', () => {
    const plugins = [
      createPlugin('apm', { consumes: ['slo.CreateFlyout', 'slo.DetailsFlyout'] }),
      createPlugin('slo', { provides: ['slo.CreateFlyout'] }),
    ];

    validateGlobalTokens(plugins);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"slo.DetailsFlyout"'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"slo" plugin may be disabled'));
  });

  it('never throws, only warns', () => {
    const plugins = [
      createPlugin('apm', { consumes: ['slo.CreateFlyout', 'ml.AnomalyDetection'] }),
    ];

    expect(() => validateGlobalTokens(plugins)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('warns when an extension point contribution has no host', () => {
    const plugins = [createPlugin('lens', { contributes: ['embeddable.FactoryRegistration'] })];

    validateGlobalTokens(plugins);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('contributes to extension point "embeddable.FactoryRegistration"')
    );
  });

  it('warns when a token has multiple hosts', () => {
    const plugins = [
      createPlugin('embeddable', { hosts: ['embeddable.FactoryRegistration'] }),
      createPlugin('dashboard', { hosts: ['embeddable.FactoryRegistration'] }),
    ];

    validateGlobalTokens(plugins);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('multiple hosts'));
  });
});
