/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DiscoveredPlugin, PluginOpaqueId, PluginType } from '@kbn/core-base-common';
import { type MockedLogger, loggerMock } from '@kbn/logging-mocks';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { createPluginInitializerContext } from './plugin_context';

const createPluginManifest = (pluginName: string): DiscoveredPlugin => {
  return {
    id: pluginName,
    configPath: [pluginName],
    type: PluginType.standard,
    requiredPlugins: [],
    optionalPlugins: [],
    requiredBundles: [],
  };
};

const testPluginId = 'testPluginId';

describe('createPluginInitializerContext', () => {
  let pluginId: PluginOpaqueId;
  let pluginManifest: DiscoveredPlugin;
  let pluginConfig: Record<string, unknown>;
  let coreContext: ReturnType<typeof coreContextMock.create>;
  let logger: MockedLogger;
  let initContext: PluginInitializerContext;

  beforeEach(() => {
    pluginId = Symbol(testPluginId);
    pluginManifest = createPluginManifest(testPluginId);
    pluginConfig = {};
    coreContext = coreContextMock.create();
    logger = coreContext.logger as MockedLogger;

    initContext = createPluginInitializerContext(
      coreContext,
      pluginId,
      pluginManifest,
      pluginConfig
    );
  });

  describe('logger.get', () => {
    it('calls the underlying logger factory with the correct parameters', () => {
      initContext.logger.get('service.sub');
      expect(logger.get).toHaveBeenCalledTimes(1);
      expect(logger.get).toHaveBeenCalledWith('plugins', testPluginId, 'service.sub');
    });

    it('returns the logger from the underlying factory', () => {
      const underlyingLogger = loggerMock.create();
      logger.get.mockReturnValue(underlyingLogger);
      expect(initContext.logger.get('anything')).toEqual(underlyingLogger);
    });
  });
});
