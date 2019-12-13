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
import { coreMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../../plugins/data/public/mocks';
import { embeddablePluginMock } from '../../../../../plugins/embeddable/public/mocks';
import { expressionsPluginMock } from '../../../../../plugins/expressions/public/mocks';
import { inspectorPluginMock } from '../../../../../plugins/inspector/public/mocks';
import { uiActionsPluginMock } from '../../../../../plugins/ui_actions/public/mocks';
import { managementPluginMock } from '../../../../../plugins/management/public/mocks';
/* eslint-enable @kbn/eslint/no-restricted-paths */

export const pluginsMock = {
  createSetup: () => ({
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createSetupContract(),
    inspector: inspectorPluginMock.createSetupContract(),
    expressions: expressionsPluginMock.createSetupContract(),
    uiActions: uiActionsPluginMock.createSetupContract(),
  }),
  createStart: () => ({
    data: dataPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    inspector: inspectorPluginMock.createStartContract(),
    expressions: expressionsPluginMock.createStartContract(),
    uiActions: uiActionsPluginMock.createStartContract(),
    management: managementPluginMock.createStartContract(),
  }),
};

export const createUiNewPlatformMock = () => {
  const mock = {
    npSetup: {
      core: coreMock.createSetup(),
      plugins: pluginsMock.createSetup(),
    },
    npStart: {
      core: coreMock.createStart(),
      plugins: pluginsMock.createStart(),
    },
  };
  return mock;
};
