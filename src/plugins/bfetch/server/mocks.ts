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

import { BfetchServerSetup, BfetchServerStart } from '.';
import { plugin as pluginInitializer } from '.';
import { coreMock } from '../../../core/server/mocks';

export type Setup = jest.Mocked<BfetchServerSetup>;
export type Start = jest.Mocked<BfetchServerStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    addBatchProcessingRoute: jest.fn(),
    addStreamingResponseRoute: jest.fn(),
    createStreamingRequestHandler: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {};

  return startContract;
};

const createPlugin = async () => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = await plugin.setup(coreSetup, {});

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: async () => await plugin.start(coreStart, {}),
  };
};

export const bfetchPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
