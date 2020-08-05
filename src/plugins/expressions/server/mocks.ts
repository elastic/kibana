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

import { ExpressionsServerSetup, ExpressionsServerStart } from '.';
import { plugin as pluginInitializer } from '.';
import { coreMock } from '../../../core/server/mocks';
import { bfetchPluginMock } from '../../bfetch/server/mocks';

export type Setup = jest.Mocked<ExpressionsServerSetup>;
export type Start = jest.Mocked<ExpressionsServerStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    fork: jest.fn(),
    getFunction: jest.fn(),
    getFunctions: jest.fn(),
    getRenderer: jest.fn(),
    getRenderers: jest.fn(),
    getType: jest.fn(),
    getTypes: jest.fn(),
    registerFunction: jest.fn(),
    registerRenderer: jest.fn(),
    registerType: jest.fn(),
    run: jest.fn(),
    __LEGACY: {
      register: jest.fn(),
      registries: jest.fn(),
    },
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    execute: jest.fn(),
    fork: jest.fn(),
    getFunction: jest.fn(),
    getFunctions: jest.fn(),
    getRenderer: jest.fn(),
    getRenderers: jest.fn(),
    getType: jest.fn(),
    getTypes: jest.fn(),
    run: jest.fn(),
  };

  return startContract;
};

const createPlugin = async () => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = await plugin.setup(coreSetup, {
    bfetch: bfetchPluginMock.createSetupContract(),
  });

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: async () =>
      await plugin.start(coreStart, {
        bfetch: bfetchPluginMock.createStartContract(),
      }),
  };
};

export const expressionsPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
