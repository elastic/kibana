/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginOpaqueId } from '..';
import { MockContextConstructor } from './context_service.test.mocks';
import { ContextService } from './context_service';
import { CoreContext } from '../core_context';

const pluginDependencies = new Map<PluginOpaqueId, PluginOpaqueId[]>();

describe('ContextService', () => {
  describe('#preboot()', () => {
    test('createContextContainer returns a new container configured with pluginDependencies', () => {
      const coreId = Symbol();
      const service = new ContextService({ coreId } as CoreContext);
      const preboot = service.preboot({ pluginDependencies });
      expect(preboot.createContextContainer()).toBeDefined();
      expect(MockContextConstructor).toHaveBeenCalledWith(pluginDependencies, coreId);
    });
  });

  describe('#setup()', () => {
    test('createContextContainer returns a new container configured with pluginDependencies', () => {
      const coreId = Symbol();
      const service = new ContextService({ coreId } as CoreContext);

      service.preboot({ pluginDependencies: new Map() });

      const setup = service.setup({ pluginDependencies });
      expect(setup.createContextContainer()).toBeDefined();
      expect(MockContextConstructor).toHaveBeenCalledWith(pluginDependencies, coreId);
    });
  });
});
