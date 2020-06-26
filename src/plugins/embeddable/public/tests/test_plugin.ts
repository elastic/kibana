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
import { UiActionsStart } from '../../../ui_actions/public';
// eslint-disable-next-line
import { uiActionsPluginMock } from '../../../ui_actions/public/mocks';
// eslint-disable-next-line
import { inspectorPluginMock } from '../../../inspector/public/mocks';
import { dataPluginMock } from '../../../data/public/mocks';
import { coreMock } from '../../../../core/public/mocks';
import { EmbeddablePublicPlugin, EmbeddableSetup, EmbeddableStart } from '../plugin';

export interface TestPluginReturn {
  plugin: EmbeddablePublicPlugin;
  coreSetup: CoreSetup;
  coreStart: CoreStart;
  setup: EmbeddableSetup;
  doStart: (anotherCoreStart?: CoreStart) => EmbeddableStart;
  uiActions: UiActionsStart;
}

export const testPlugin = (
  coreSetup: CoreSetup = coreMock.createSetup(),
  coreStart: CoreStart = coreMock.createStart()
): TestPluginReturn => {
  const uiActions = uiActionsPluginMock.createPlugin(coreSetup, coreStart);
  const initializerContext = {} as any;
  const plugin = new EmbeddablePublicPlugin(initializerContext);
  const setup = plugin.setup(coreSetup, {
    data: dataPluginMock.createSetupContract(),
    uiActions: uiActions.setup,
  });

  return {
    plugin,
    coreSetup,
    coreStart,
    setup,
    doStart: (anotherCoreStart: CoreStart = coreStart) => {
      const start = plugin.start(anotherCoreStart, {
        data: dataPluginMock.createStartContract(),
        inspector: inspectorPluginMock.createStartContract(),
        uiActions: uiActionsPluginMock.createStartContract(),
      });
      return start;
    },
    uiActions: uiActions.doStart(coreStart),
  };
};
