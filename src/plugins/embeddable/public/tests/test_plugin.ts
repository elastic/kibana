/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart } from 'src/core/public';
import { UiActionsStart } from '../../../ui_actions/public';
import { uiActionsPluginMock } from '../../../ui_actions/public/mocks';
import { inspectorPluginMock } from '../../../inspector/public/mocks';
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
    uiActions: uiActions.setup,
  });

  return {
    plugin,
    coreSetup,
    coreStart,
    setup,
    doStart: (anotherCoreStart: CoreStart = coreStart) => {
      const start = plugin.start(anotherCoreStart, {
        inspector: inspectorPluginMock.createStartContract(),
        uiActions: uiActionsPluginMock.createStartContract(),
      });
      return start;
    },
    uiActions: uiActions.doStart(coreStart),
  };
};
