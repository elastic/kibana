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

import { CoreSetup, CoreStart } from 'src/core/public';
import { UiActionsSetup, UiActionsStart } from '.';
import { plugin as pluginInitializer } from '.';
import { coreMock } from '../../../core/public/mocks';

export type Setup = jest.Mocked<UiActionsSetup>;
export type Start = jest.Mocked<UiActionsStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    attachAction: jest.fn(),
    detachAction: jest.fn(),
    registerAction: jest.fn(),
    registerTrigger: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    attachAction: jest.fn(),
    registerAction: jest.fn(),
    registerTrigger: jest.fn(),
    detachAction: jest.fn(),
    executeTriggerActions: jest.fn(),
    getTrigger: jest.fn(),
    getTriggerActions: jest.fn((id: string) => []),
    getTriggerCompatibleActions: jest.fn(),
    clear: jest.fn(),
    fork: jest.fn(),
  };

  return startContract;
};

const createPlugin = (
  coreSetup: CoreSetup = coreMock.createSetup(),
  coreStart: CoreStart = coreMock.createStart()
) => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = plugin.setup(coreSetup);

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: (anotherCoreStart: CoreStart = coreStart) => plugin.start(anotherCoreStart),
  };
};

export const uiActionsPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
