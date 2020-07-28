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
import React from 'react';
import {
  EmbeddableStart,
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStartDependencies,
  EmbeddableStateTransfer,
  IEmbeddable,
  EmbeddablePanel,
} from '.';
import { EmbeddablePublicPlugin } from './plugin';
import { coreMock } from '../../../core/public/mocks';
import { UiActionsService } from './lib/ui_actions';
import { CoreStart } from '../../../core/public';
import { Start as InspectorStart } from '../../inspector/public';
import { dataPluginMock } from '../../data/public/mocks';

// eslint-disable-next-line
import { inspectorPluginMock } from '../../inspector/public/mocks';
// eslint-disable-next-line
import { uiActionsPluginMock } from '../../ui_actions/public/mocks';

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
    />
  );
};

export const createEmbeddableStateTransferMock = (): Partial<EmbeddableStateTransfer> => {
  return {
    getIncomingEditorState: jest.fn(),
    getIncomingEmbeddablePackage: jest.fn(),
    navigateToEditor: jest.fn(),
    navigateToWithEmbeddablePackage: jest.fn(),
  };
};

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    registerEmbeddableFactory: jest.fn(),
    setCustomEmbeddableFactoryProvider: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    getEmbeddableFactories: jest.fn(),
    getEmbeddableFactory: jest.fn(),
    EmbeddablePanel: jest.fn(),
    getAttributeService: jest.fn(),
    getEmbeddablePanel: jest.fn(),
    getStateTransfer: jest.fn(() => createEmbeddableStateTransferMock() as EmbeddableStateTransfer),
    filtersAndTimeRangeFromContext: jest.fn(),
    filtersFromContext: jest.fn(),
  };
  return startContract;
};

const createInstance = (setupPlugins: Partial<EmbeddableSetupDependencies> = {}) => {
  const plugin = new EmbeddablePublicPlugin({} as any);
  const setup = plugin.setup(coreMock.createSetup(), {
    uiActions: setupPlugins.uiActions || uiActionsPluginMock.createSetupContract(),
    data: dataPluginMock.createSetupContract(),
  });
  const doStart = (startPlugins: Partial<EmbeddableStartDependencies> = {}) =>
    plugin.start(coreMock.createStart(), {
      uiActions: startPlugins.uiActions || uiActionsPluginMock.createStartContract(),
      inspector: inspectorPluginMock.createStartContract(),
      data: dataPluginMock.createStartContract(),
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
