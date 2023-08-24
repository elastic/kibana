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
import {
  SavedObjectManagementTypeInfo,
  SavedObjectsManagementPluginStart,
} from '@kbn/saved-objects-management-plugin/public';
import { Query } from '@kbn/es-query';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
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
  const savedObjectsManagementMock = {
    parseQuery: (query: Query, types: SavedObjectManagementTypeInfo[]) => {
      return {
        queryText: 'some search',
      };
    },
    getTagFindReferences: ({
      selectedTags,
      taggingApi,
    }: {
      selectedTags?: string[];
      taggingApi?: SavedObjectsTaggingApi;
    }) => {
      return undefined;
    },
  };

  return {
    plugin,
    coreSetup,
    coreStart,
    setup,
    doStart: (anotherCoreStart: CoreStart = coreStart) => {
      const start = plugin.start(anotherCoreStart, {
        inspector: inspectorPluginMock.createStartContract(),
        uiActions: uiActionsPluginMock.createStartContract(),
        savedObjectsManagement:
          savedObjectsManagementMock as unknown as SavedObjectsManagementPluginStart,
        usageCollection: { reportUiCounter: jest.fn() },
        contentManagement: contentManagementMock.createStartContract(),
      });
      return start;
    },
    uiActions: uiActions.doStart(coreStart),
  };
};
