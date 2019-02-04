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

import { getInterpreter } from './interpreter';

import { createSocket } from '@kbn/interpreter/public';
import { functionsRegistry } from './functions_registry';

jest.mock('@kbn/interpreter/public', () => ({
  createSocket: jest.fn(),
  initializeInterpreter: jest.fn(() => Promise.resolve()),
  loadBrowserRegistries: jest.fn(() => Promise.resolve())
}));

jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn(() => '/abc/s/123'),
  getInjected: jest.fn(config => { // eslint-disable-line no-unused-vars
    return config === 'serverBasePath' ? '/abc' : '/123';
  }),
}));

jest.mock('./functions', () => ({
  functions: [jest.fn()]
}));

jest.mock('./render_functions_registry', () => ({
  renderFunctionsRegistry: {
    register: jest.fn()
  }
}));

jest.mock('./renderers/visualization', () => ({
  visualization: jest.fn()
}));

jest.mock('./functions_registry', () => ({
  functionsRegistry: {
    register: jest.fn()
  }
}));

jest.mock('./types_registry', () => ({
  typesRegistry: jest.fn()
}));

describe('Core Interpreter', () => {

  beforeEach(() => {
    jest.resetModules();
  });

  describe('getInterpreter', () => {

    it('calls createSocket with the correct arguments', async () => {
      await getInterpreter();
      expect(createSocket).toHaveBeenCalledTimes(1);
      expect(createSocket).toHaveBeenCalledWith('/abc', functionsRegistry);
    });

  });

});
