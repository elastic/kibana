/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
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
  const initializerContext = {} as PluginInitializerContext;
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
