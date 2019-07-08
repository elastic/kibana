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

// import { ContextContainerImplementation } from './context';

import { MockContextConstructor } from './context_service.test.mocks';
import { ContextService } from './context_service';
import { ContextContainerMock } from './context.mock';

const pluginDependencies = new Map<string, string[]>([
  ['pluginA', []],
  ['pluginB', ['pluginA']],
  ['pluginC', ['pluginB']],
]);

describe('ContextService', () => {
  describe('#setup()', () => {
    test('createContextContainer returns a new container configured with pluginDependencies', () => {
      const service = new ContextService();
      const setup = service.setup({ pluginDependencies });
      expect(setup.createContextContainer()).toBeDefined();
      expect(MockContextConstructor).toHaveBeenCalledWith(pluginDependencies);
    });

    test('setCurrentPlugin does not fail if there are no contianers', () => {
      const service = new ContextService();
      const setup = service.setup({ pluginDependencies });
      expect(() => setup.setCurrentPlugin('pluginA')).not.toThrow();
    });

    test('setCurrentPlugin calls on all context containers', () => {
      const service = new ContextService();
      const setup = service.setup({ pluginDependencies });
      const container1 = setup.createContextContainer() as ContextContainerMock;
      const container2 = setup.createContextContainer() as ContextContainerMock;
      const container3 = setup.createContextContainer() as ContextContainerMock;

      setup.setCurrentPlugin('pluginA');
      expect(container1.setCurrentPlugin).toHaveBeenCalledWith('pluginA');
      expect(container2.setCurrentPlugin).toHaveBeenCalledWith('pluginA');
      expect(container3.setCurrentPlugin).toHaveBeenCalledWith('pluginA');

      setup.setCurrentPlugin('pluginB');
      expect(container1.setCurrentPlugin).toHaveBeenCalledWith('pluginB');
      expect(container2.setCurrentPlugin).toHaveBeenCalledWith('pluginB');
      expect(container3.setCurrentPlugin).toHaveBeenCalledWith('pluginB');

      setup.setCurrentPlugin(undefined);
      expect(container1.setCurrentPlugin).toHaveBeenCalledWith(undefined);
      expect(container2.setCurrentPlugin).toHaveBeenCalledWith(undefined);
      expect(container3.setCurrentPlugin).toHaveBeenCalledWith(undefined);
    });
  });

  describe('#start()', () => {
    test('setCurrentPlugin does not fail if there are no contianers', () => {
      const service = new ContextService();
      service.setup({ pluginDependencies });
      const start = service.start();
      expect(() => start.setCurrentPlugin('pluginA')).not.toThrow();
    });

    test('setCurrentPlugin calls on all context containers', () => {
      const service = new ContextService();
      const setup = service.setup({ pluginDependencies });
      const container1 = setup.createContextContainer() as ContextContainerMock;
      const container2 = setup.createContextContainer() as ContextContainerMock;
      const container3 = setup.createContextContainer() as ContextContainerMock;

      const start = service.start();

      start.setCurrentPlugin('pluginA');
      expect(container1.setCurrentPlugin).toHaveBeenCalledWith('pluginA');
      expect(container2.setCurrentPlugin).toHaveBeenCalledWith('pluginA');
      expect(container3.setCurrentPlugin).toHaveBeenCalledWith('pluginA');

      start.setCurrentPlugin('pluginB');
      expect(container1.setCurrentPlugin).toHaveBeenCalledWith('pluginB');
      expect(container2.setCurrentPlugin).toHaveBeenCalledWith('pluginB');
      expect(container3.setCurrentPlugin).toHaveBeenCalledWith('pluginB');

      start.setCurrentPlugin(undefined);
      expect(container1.setCurrentPlugin).toHaveBeenCalledWith(undefined);
      expect(container2.setCurrentPlugin).toHaveBeenCalledWith(undefined);
      expect(container3.setCurrentPlugin).toHaveBeenCalledWith(undefined);
    });
  });
});
