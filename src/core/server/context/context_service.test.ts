/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginOpaqueId } from '../../server';
import { MockContextConstructor } from './context_service.test.mocks';
import { ContextService } from './context_service';
import { CoreContext } from '../core_context';

const pluginDependencies = new Map<PluginOpaqueId, PluginOpaqueId[]>();

describe('ContextService', () => {
  describe('#setup()', () => {
    test('createContextContainer returns a new container configured with pluginDependencies', () => {
      const coreId = Symbol();
      const service = new ContextService({ coreId } as CoreContext);
      const setup = service.setup({ pluginDependencies });
      expect(setup.createContextContainer()).toBeDefined();
      expect(MockContextConstructor).toHaveBeenCalledWith(pluginDependencies, coreId);
    });
  });
});
