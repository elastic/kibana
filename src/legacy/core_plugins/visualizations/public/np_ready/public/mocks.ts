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

jest.mock('ui/vis/vis_filters');
jest.mock('ui/vis/default_feedback_message');
jest.mock('ui/vis/index.js');
jest.mock('ui/vis/vis_factory');
jest.mock('ui/registry/vis_types');
jest.mock('./types/vis_type_alias_registry');

import { VisualizationsSetup, VisualizationsStart } from './';
import { VisualizationsPlugin } from './plugin';
import { coreMock } from '../../../../../../core/public/mocks';

/* eslint-disable */
import { dataPluginMock } from '../../../../../../plugins/data/public/mocks';
import { embeddablePluginMock } from '../../../../../../plugins/embeddable/public/mocks';
import { expressionsPluginMock } from '../../../../../../plugins/expressions/public/mocks';
/* eslint-enable */

const createSetupContract = (): VisualizationsSetup => ({
  types: {
    createBaseVisualization: jest.fn(),
    createReactVisualization: jest.fn(),
    registerAlias: jest.fn(),
    hideTypes: jest.fn(),
  },
});

const createStartContract = (): VisualizationsStart => ({
  types: {
    get: jest.fn(),
    all: jest.fn(),
    getAliases: jest.fn(),
  },
  showNewVisModal: jest.fn(),
});

const createInstance = async () => {
  const plugin = new VisualizationsPlugin({} as PluginInitializerContext);

  const setup = plugin.setup(coreMock.createSetup(), {
    expressions: expressionsPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createStartContract(),
  });
  const doStart = () =>
    plugin.start(coreMock.createStart(), {
      data: dataPluginMock.createStartContract(),
    });

  return {
    plugin,
    setup,
    doStart,
  };
};

export const visualizationsPluginMock = {
  createSetupContract,
  createStartContract,
  createInstance,
};
