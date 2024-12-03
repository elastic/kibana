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
import { type AggregateQuery, type Filter, type Query } from '@kbn/es-query';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import {
  SavedObjectManagementTypeInfo,
  SavedObjectsManagementPluginStart,
} from '@kbn/saved-objects-management-plugin/public';
import { savedObjectsManagementPluginMock } from '@kbn/saved-objects-management-plugin/public/mocks';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';

import {
  EmbeddableInput,
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStart,
  EmbeddableStartDependencies,
  EmbeddableStateTransfer,
  FilterableEmbeddable,
  IEmbeddable,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
  SelfStyledEmbeddable,
} from '.';
import { setKibanaServices } from './kibana_services';
import { SelfStyledOptions } from './lib/self_styled_embeddable/types';
import { EmbeddablePublicPlugin } from './plugin';
import {
  reactEmbeddableRegistryHasKey,
  registerReactEmbeddableFactory,
} from './react_embeddable_system';
import { registerAddFromLibraryType } from './add_from_library/registry';

export { mockAttributeService } from './lib/attribute_service/attribute_service.mock';
export type Setup = jest.Mocked<EmbeddableSetup>;
export type Start = jest.Mocked<EmbeddableStart>;

export const createEmbeddableStateTransferMock = (): Partial<EmbeddableStateTransfer> => {
  return {
    clearEditorState: jest.fn(),
    getIncomingEditorState: jest.fn(),
    getIncomingEmbeddablePackage: jest.fn(),
    navigateToEditor: jest.fn(),
    navigateToWithEmbeddablePackage: jest.fn(),
  };
};

export const mockRefOrValEmbeddable = <
  OriginalEmbeddableType,
  ValTypeInput extends EmbeddableInput = EmbeddableInput,
  RefTypeInput extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
>(
  embeddable: IEmbeddable,
  options: {
    mockedByReferenceInput: RefTypeInput;
    mockedByValueInput: ValTypeInput;
  }
): OriginalEmbeddableType & ReferenceOrValueEmbeddable => {
  const newEmbeddable: ReferenceOrValueEmbeddable =
    embeddable as unknown as ReferenceOrValueEmbeddable;
  newEmbeddable.inputIsRefType = (input: unknown): input is RefTypeInput =>
    !!(input as RefTypeInput).savedObjectId;
  newEmbeddable.getInputAsRefType = () => Promise.resolve(options.mockedByReferenceInput);
  newEmbeddable.getInputAsValueType = () => Promise.resolve(options.mockedByValueInput);
  return newEmbeddable as OriginalEmbeddableType & ReferenceOrValueEmbeddable;
};

export function mockSelfStyledEmbeddable<OriginalEmbeddableType>(
  embeddable: OriginalEmbeddableType,
  selfStyledOptions: SelfStyledOptions
): OriginalEmbeddableType & SelfStyledEmbeddable {
  const newEmbeddable: SelfStyledEmbeddable = embeddable as unknown as SelfStyledEmbeddable;
  newEmbeddable.getSelfStyledOptions = () => selfStyledOptions;
  return newEmbeddable as OriginalEmbeddableType & SelfStyledEmbeddable;
}

export function mockFilterableEmbeddable<OriginalEmbeddableType>(
  embeddable: OriginalEmbeddableType,
  options: {
    getFilters: () => Filter[];
    getQuery: () => Query | AggregateQuery | undefined;
  }
): OriginalEmbeddableType & FilterableEmbeddable {
  const newEmbeddable: FilterableEmbeddable = embeddable as unknown as FilterableEmbeddable;
  newEmbeddable.getFilters = () => options.getFilters();
  newEmbeddable.getQuery = () => options.getQuery();
  return newEmbeddable as OriginalEmbeddableType & FilterableEmbeddable;
}

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    registerAddFromLibraryType: jest.fn().mockImplementation(registerAddFromLibraryType),
    registerReactEmbeddableFactory: jest.fn().mockImplementation(registerReactEmbeddableFactory),
    registerEmbeddableFactory: jest.fn(),
    registerEnhancement: jest.fn(),
    setCustomEmbeddableFactoryProvider: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    reactEmbeddableRegistryHasKey: jest.fn().mockImplementation(reactEmbeddableRegistryHasKey),
    getEmbeddableFactories: jest.fn(),
    getEmbeddableFactory: jest.fn(),
    telemetry: jest.fn(),
    extract: jest.fn(),
    inject: jest.fn(),
    getAllMigrations: jest.fn(),
    getStateTransfer: jest.fn(() => createEmbeddableStateTransferMock() as EmbeddableStateTransfer),
    getAttributeService: jest.fn(),
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
  mockRefOrValEmbeddable,
  mockSelfStyledEmbeddable,
  mockFilterableEmbeddable,
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
