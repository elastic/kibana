/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { type Query } from '@kbn/es-query';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import type {
  SavedObjectManagementTypeInfo,
  SavedObjectsManagementPluginStart,
} from '@kbn/saved-objects-management-plugin/public';
import { savedObjectsManagementPluginMock } from '@kbn/saved-objects-management-plugin/public/mocks';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';

import type { EmbeddableStateTransfer } from '.';
import { setKibanaServices } from './kibana_services';
import { EmbeddablePublicPlugin } from './plugin';
import { registerReactEmbeddableFactory } from './react_embeddable_system';
import { registerAddFromLibraryType } from './add_from_library/registry';
import type {
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStart,
  EmbeddableStartDependencies,
} from './types';

export type Setup = jest.Mocked<EmbeddableSetup>;
export type Start = jest.Mocked<EmbeddableStart>;

export const createEmbeddableStateTransferMock = (): Partial<EmbeddableStateTransfer> => {
  return {
    clearEditorState: jest.fn(),
    getIncomingEditorState: jest.fn(),
    getIncomingEmbeddablePackage: jest.fn(),
    navigateToEditor: jest.fn(),
    navigateToWithEmbeddablePackages: jest.fn(),
  };
};

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    registerAddFromLibraryType: jest.fn().mockImplementation(registerAddFromLibraryType),
    registerReactEmbeddableFactory: jest.fn().mockImplementation(registerReactEmbeddableFactory),
    registerLegacyURLTransform: jest.fn(),
    transformEnhancementsIn: jest.fn(),
    transformEnhancementsOut: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    getAddFromLibraryComponent: jest.fn(),
    getStateTransfer: jest.fn(() => createEmbeddableStateTransferMock() as EmbeddableStateTransfer),
    getLegacyURLTransform: jest.fn(),
    hasLegacyURLTransform: jest.fn(),
  };
  return startContract;
};

const createInstance = (setupPlugins: Partial<EmbeddableSetupDependencies> = {}) => {
  const plugin = new EmbeddablePublicPlugin({} as any);
  const setup = plugin.setup(coreMock.createSetup(), {
    uiActions: setupPlugins.uiActions || uiActionsPluginMock.createSetupContract(),
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
  const doStart = (startPlugins: Partial<EmbeddableStartDependencies> = {}) =>
    plugin.start(coreMock.createStart(), {
      uiActions: startPlugins.uiActions || uiActionsPluginMock.createStartContract(),
      inspector: inspectorPluginMock.createStartContract(),
      savedObjectsManagement:
        savedObjectsManagementMock as unknown as SavedObjectsManagementPluginStart,
      usageCollection: { reportUiCounter: jest.fn() },
      contentManagement:
        startPlugins.contentManagement || contentManagementMock.createStartContract(),
    });
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

export const setStubKibanaServices = () => {
  const core = coreMock.createStart();
  const selfStart = embeddablePluginMock.createStartContract();

  setKibanaServices(core, selfStart, {
    uiActions: uiActionsPluginMock.createStartContract(),
    inspector: inspectorPluginMock.createStartContract(),
    savedObjectsManagement: savedObjectsManagementPluginMock.createStartContract(),
    usageCollection: { reportUiCounter: jest.fn() },
    contentManagement: contentManagementMock.createStartContract(),
  });
};
