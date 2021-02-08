/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginOpaqueId } from '../../server';
import { MockContextConstructor } from './context_service.test.mocks';
import { ContextService } from './context_service';
import { coreMock } from '../mocks';

const pluginDependencies = new Map<PluginOpaqueId, PluginOpaqueId[]>();

describe('ContextService', () => {
  describe('#setup()', () => {
    test('createContextContainer returns a new container configured with pluginDependencies', () => {
      const context = coreMock.createCoreContext();
      const service = new ContextService(context);
      const setup = service.setup({ pluginDependencies });
      expect(setup.createContextContainer()).toBeDefined();
      expect(MockContextConstructor).toHaveBeenCalledWith(pluginDependencies, context.coreId);
    });
  });
});
