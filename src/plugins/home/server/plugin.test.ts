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

import { registryMock } from './plugin.test.mocks';
import { HomeServerPlugin } from './plugin';
import { coreMock } from '../../../core/server/mocks';
import { CoreSetup } from '../../../core/server';

type MockedKeys<T> = { [P in keyof T]: jest.Mocked<T[P]> };

describe('HomeServerPlugin', () => {
  beforeEach(() => {
    registryMock.setup.mockClear();
    registryMock.start.mockClear();
  });

  describe('setup', () => {
    const mockCoreSetup: MockedKeys<CoreSetup> = coreMock.createSetup();

    test('wires up and returns registerTutorial and addScopedTutorialContextFactory', () => {
      const setup = new HomeServerPlugin().setup(mockCoreSetup);
      expect(setup).toHaveProperty('tutorials');
      expect(setup.tutorials).toHaveProperty('registerTutorial');
      expect(setup.tutorials).toHaveProperty('addScopedTutorialContextFactory');
    });
  });

  describe('start', () => {
    test('is defined', () => {
      const start = new HomeServerPlugin().start();
      expect(start).toBeDefined();
      expect(start).toHaveProperty('tutorials');
    });
  });
});
