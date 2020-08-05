/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
