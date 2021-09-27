/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegrationsPlugin } from './plugin';

import { coreMock } from '../../../core/server/mocks';

describe('CustomIntegrationsPlugin', () => {
  beforeEach(() => {});

  describe('setup', () => {
    let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
    let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;

    beforeEach(() => {
      mockCoreSetup = coreMock.createSetup();
      initContext = coreMock.createPluginInitializerContext();
    });

    test('wires up tutorials provider service and returns registerTutorial and addScopedTutorialContextFactory', () => {
      const setup = new CustomIntegrationsPlugin(initContext).setup(mockCoreSetup);
      expect(setup).toHaveProperty('registerCustomIntegration');
      expect(setup).toHaveProperty('getAppendCustomIntegrations');
    });
  });
});
