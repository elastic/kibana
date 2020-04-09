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

import { PluginInitializerContext } from 'src/core/public';
import { coreMock } from '../../../core/public/mocks';
import {
  IndexPatternManagementSetup,
  IndexPatternManagementStart,
  IndexPatternManagementPlugin,
} from './plugin';

const createSetupContract = (): IndexPatternManagementSetup => ({
  creation: {
    addCreationConfig: jest.fn(),
  } as any,
  list: {
    addListConfig: jest.fn(),
  } as any,
});

const createStartContract = (): IndexPatternManagementStart => ({
  creation: {
    getType: jest.fn(),
    getIndexPatternCreationOptions: jest.fn(),
  } as any,
  list: {
    getIndexPatternTags: jest.fn(),
    getFieldInfo: jest.fn(),
    areScriptedFieldsEnabled: jest.fn(),
  } as any,
});

const createInstance = async () => {
  const plugin = new IndexPatternManagementPlugin({} as PluginInitializerContext);

  const setup = plugin.setup(coreMock.createSetup());
  const doStart = () => plugin.start(coreMock.createStart(), {});

  return {
    plugin,
    setup,
    doStart,
  };
};

export const mockManagementPlugin = {
  createSetupContract,
  createStartContract,
  createInstance,
};
