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

/* eslint-disable @kbn/eslint/no-restricted-paths */
jest.mock('ui/vis/vis_filters');
jest.mock('ui/vis/default_feedback_message');
jest.mock('ui/vis/index.js');
jest.mock('ui/vis/vis_factory');
jest.mock('ui/registry/vis_types');
// @ts-ignore
import { VisFiltersProvider, createFilter } from 'ui/vis/vis_filters';
// @ts-ignore
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';
// @ts-ignore
import { VisProvider as Vis } from 'ui/vis/index.js';
// @ts-ignore
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
/* eslint-enable @kbn/eslint/no-restricted-paths */
jest.mock('./types/vis_type_alias_registry');
import { visTypeAliasRegistry } from './types/vis_type_alias_registry';

import { Plugin } from '.';
import { coreMock } from '../../../../../core/public/mocks';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const createSetupContract = (): Setup => ({
  filters: {
    VisFiltersProvider: jest.fn(),
    createFilter: jest.fn(),
  },
  types: {
    Vis,
    VisFactoryProvider: jest.fn(),
    registerVisualization: jest.fn(),
    defaultFeedbackMessage,
    visTypeAliasRegistry: {
      add: jest.fn(),
      get: jest.fn(),
    },
  },
});

const createStartContract = (): Start => {};

const createInstance = () => {
  const plugin = new Plugin({} as any);

  const setup = plugin.setup(coreMock.createSetup(), {
    __LEGACY: {
      VisFiltersProvider,
      createFilter,

      Vis,
      VisFactoryProvider,
      VisTypesRegistryProvider,
      defaultFeedbackMessage,
      visTypeAliasRegistry,
    },
  });
  const doStart = () => plugin.start(coreMock.createStart());

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
