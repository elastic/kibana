/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { coreMock, themeServiceMock } from '@kbn/core/public/mocks';
import { CoreStart } from '@kbn/core/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';

import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { UiActionsService } from './lib/ui_actions';
import { EmbeddablePublicPlugin } from './plugin';
import {
  EmbeddableStart,
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStartDependencies,
  EmbeddableStateTransfer,
  IEmbeddable,
  EmbeddablePanel,
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  ReferenceOrValueEmbeddable,
} from '.';

export { mockAttributeService } from './lib/attribute_service/attribute_service.mock';
export type Setup = jest.Mocked<EmbeddableSetup>;
export type Start = jest.Mocked<EmbeddableStart>;

interface CreateEmbeddablePanelMockArgs {
  getActions: UiActionsService['getTriggerCompatibleActions'];
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  getAllEmbeddableFactories: EmbeddableStart['getEmbeddableFactories'];
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
  inspector: InspectorStart;
  SavedObjectFinder: React.ComponentType<any>;
}

const theme = themeServiceMock.createStartContract();

export const createEmbeddablePanelMock = ({
  getActions,
  getEmbeddableFactory,
  getAllEmbeddableFactories,
  overlays,
  notifications,
  application,
  inspector,
  SavedObjectFinder,
}: Partial<CreateEmbeddablePanelMockArgs>) => {
  return ({ embeddable }: { embeddable: IEmbeddable }) => (
    <EmbeddablePanel
      embeddable={embeddable}
      getActions={getActions || (() => Promise.resolve([]))}
      getAllEmbeddableFactories={getAllEmbeddableFactories || ((() => []) as any)}
      getEmbeddableFactory={getEmbeddableFactory || ((() => undefined) as any)}
      notifications={notifications || ({} as any)}
      application={application || ({} as any)}
      overlays={overlays || ({} as any)}
      inspector={inspector || ({} as any)}
      SavedObjectFinder={SavedObjectFinder || (() => null)}
      theme={theme}
    />
  );
};

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

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    registerEmbeddableFactory: jest.fn(),
    registerEnhancement: jest.fn(),
    setCustomEmbeddableFactoryProvider: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    getEmbeddableFactories: jest.fn(),
    getEmbeddableFactory: jest.fn(),
    telemetry: jest.fn(),
    extract: jest.fn(),
    inject: jest.fn(),
    getAllMigrations: jest.fn(),
    EmbeddablePanel: jest.fn(),
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
  const doStart = (startPlugins: Partial<EmbeddableStartDependencies> = {}) =>
    plugin.start(coreMock.createStart(), {
      uiActions: startPlugins.uiActions || uiActionsPluginMock.createStartContract(),
      inspector: inspectorPluginMock.createStartContract(),
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
};
