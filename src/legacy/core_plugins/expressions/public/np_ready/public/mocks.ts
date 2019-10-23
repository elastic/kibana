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

import { ExpressionsSetup, ExpressionsStart, plugin as pluginInitializer } from '.';
/* eslint-disable */
import { coreMock } from '../../../../../../core/public/mocks';
import { inspectorPluginMock } from '../../../../../../plugins/inspector/public/mocks';
/* eslint-enable */

const createExpressionsSetupMock = (): ExpressionsSetup => {
  return {
    registerFunction: jest.fn(),
    registerRenderer: jest.fn(),
    registerType: jest.fn(),
    __LEGACY: {
      functions: {
        register: () => {},
      } as any,
      renderers: {
        register: () => {},
      } as any,
      types: {
        register: () => {},
      } as any,
    },
  };
};

function createExpressionsStartMock(): ExpressionsStart {
  return {
    ExpressionRenderer: jest.fn(() => null),
    execute: jest.fn(),
    loader: jest.fn(),
    render: jest.fn(),
    ExpressionRenderHandler: jest.fn(),
    ExpressionDataHandler: jest.fn(),
    ExpressionLoader: jest.fn(),
  };
}

const createPlugin = async () => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = await plugin.setup(coreSetup, {
    inspector: inspectorPluginMock.createSetupContract(),
  });

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: async () =>
      await plugin.start(coreStart, {
        inspector: inspectorPluginMock.createStartContract(),
      }),
  };
};

export const expressionsPluginMock = {
  createSetup: createExpressionsSetupMock,
  createStart: createExpressionsStartMock,
  createPlugin,
};
