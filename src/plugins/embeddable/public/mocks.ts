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

import { Plugin } from '.';
import { coreMock } from '../../../core/public/mocks';

// eslint-disable-next-line
import { uiActionsPluginMock } from '../../ui_actions/public/mocks';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    registerEmbeddableFactory: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    registerEmbeddableFactory: jest.fn(),
    getEmbeddableFactories: jest.fn(),
    getEmbeddableFactory: jest.fn(),
  };
  return startContract;
};

const createInstance = () => {
  const plugin = new Plugin({} as any);
  const setup = plugin.setup(coreMock.createSetup(), {
    uiActions: uiActionsPluginMock.createSetupContract(),
  });
  const doStart = () => plugin.start(coreMock.createStart());
  return {
    plugin,
    setup,
    doStart,
  };
};

export const embeddablePluginMock = {
  createSetupContract,
  createStartContract,
  createInstance,
};
