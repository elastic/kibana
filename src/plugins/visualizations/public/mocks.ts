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

import { PluginInitializerContext } from '../../../core/public';
import { VisualizationsSetup, VisualizationsStart } from './';
import { VisualizationsPlugin } from './plugin';
import { coreMock, applicationServiceMock } from '../../../core/public/mocks';
import { embeddablePluginMock } from '../../../plugins/embeddable/public/mocks';
import { expressionsPluginMock } from '../../../plugins/expressions/public/mocks';
import { dataPluginMock } from '../../../plugins/data/public/mocks';
import { usageCollectionPluginMock } from '../../../plugins/usage_collection/public/mocks';
import { uiActionsPluginMock } from '../../../plugins/ui_actions/public/mocks';
import { inspectorPluginMock } from '../../../plugins/inspector/public/mocks';

const createSetupContract = (): VisualizationsSetup => ({
  createBaseVisualization: jest.fn(),
  createReactVisualization: jest.fn(),
  registerAlias: jest.fn(),
  hideTypes: jest.fn(),
});

const createStartContract = (): VisualizationsStart => ({
  get: jest.fn(),
  all: jest.fn(),
  getAliases: jest.fn(),
  savedVisualizationsLoader: {
    get: jest.fn(),
  } as any,
  showNewVisModal: jest.fn(),
  createVis: jest.fn(),
  convertFromSerializedVis: jest.fn(),
  convertToSerializedVis: jest.fn(),
  __LEGACY: {
    createVisEmbeddableFromObject: jest.fn(),
  },
});

const createInstance = async () => {
  const plugin = new VisualizationsPlugin({} as PluginInitializerContext);

  const setup = plugin.setup(coreMock.createSetup(), {
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createSetupContract(),
    expressions: expressionsPluginMock.createSetupContract(),
    inspector: inspectorPluginMock.createSetupContract(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
  });
  const doStart = () =>
    plugin.start(coreMock.createStart(), {
      data: dataPluginMock.createStartContract(),
      expressions: expressionsPluginMock.createStartContract(),
      inspector: inspectorPluginMock.createStartContract(),
      uiActions: uiActionsPluginMock.createStartContract(),
      application: applicationServiceMock.createStartContract(),
      embeddable: embeddablePluginMock.createStartContract(),
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
