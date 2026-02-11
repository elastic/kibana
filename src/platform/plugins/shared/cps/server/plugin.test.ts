/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CPSServerPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { registerRoutes } from './routes';

jest.mock('./routes', () => ({
  registerRoutes: jest.fn(),
}));

describe('CPSServerPlugin', () => {
  let plugin: CPSServerPlugin;
  let mockInitContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
  });

  describe('when cpsEnabled is true', () => {
    beforeEach(() => {
      mockInitContext = coreMock.createPluginInitializerContext({ cpsEnabled: true });
      (mockInitContext.env.packageInfo as any).buildFlavor = 'serverless';
      plugin = new CPSServerPlugin(mockInitContext);
    });

    it('should return true from getCpsEnabled', () => {
      const setup = plugin.setup(mockCoreSetup);
      expect(setup.getCpsEnabled()).toBe(true);
    });

    it('should call setCpsFeatureFlag with true', () => {
      plugin.setup(mockCoreSetup);
      expect(mockCoreSetup.elasticsearch.setCpsFeatureFlag).toHaveBeenCalledWith(true);
    });
  });

  describe('when cpsEnabled is false', () => {
    beforeEach(() => {
      mockInitContext = coreMock.createPluginInitializerContext({ cpsEnabled: false });
      (mockInitContext.env.packageInfo as any).buildFlavor = 'serverless';
      plugin = new CPSServerPlugin(mockInitContext);
    });

    it('should return false from getCpsEnabled', () => {
      const setup = plugin.setup(mockCoreSetup);
      expect(setup.getCpsEnabled()).toBe(false);
    });

    it('should call setCpsFeatureFlag with false', () => {
      plugin.setup(mockCoreSetup);
      expect(mockCoreSetup.elasticsearch.setCpsFeatureFlag).toHaveBeenCalledWith(false);
    });
  });

  it('should register routes in serverless mode', () => {
    plugin.setup(mockCoreSetup);
    expect(registerRoutes).toHaveBeenCalled();
  });
});
