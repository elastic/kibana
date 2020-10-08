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
import { isErrorEmbeddable, IContainer, ReferenceOrValueEmbeddable } from '../../embeddable_plugin';
import { DashboardContainer } from '../embeddable';
import { getSampleDashboardInput } from '../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../../embeddable_plugin_test_samples';
import { coreMock } from '../../../../../core/public/mocks';
import { CoreStart } from 'kibana/public';
import { UnlinkFromLibraryAction } from '.';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';
import { ViewMode, SavedObjectEmbeddableInput } from '../../../../embeddable/public';

const { setup, doStart } = embeddablePluginMock.createInstance();
setup.registerEmbeddableFactory(
  CONTACT_CARD_EMBEDDABLE,
  new ContactCardEmbeddableFactory((() => null) as any, {} as any)
);
const start = doStart();

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;
let coreStart: CoreStart;
beforeEach(async () => {
  coreStart = coreMock.createStart();

  const containerOptions = {
    ExitFullScreenButton: () => null,
    SavedObjectFinder: () => null,
    application: {} as any,
    embeddable: start,
    inspector: {} as any,
    notifications: {} as any,
    overlays: coreStart.overlays,
    savedObjectMetaData: {} as any,
    uiActions: {} as any,
  };

  container = new DashboardContainer(getSampleDashboardInput(), containerOptions);

  const contactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Kibanana',
  });

  if (isErrorEmbeddable(contactCardEmbeddable)) {
    throw new Error('Failed to create embeddable');
  }
  embeddable = embeddablePluginMock.mockRefOrValEmbeddable<
    ContactCardEmbeddable,
    ContactCardEmbeddableInput
  >(contactCardEmbeddable, {
    mockedByReferenceInput: { savedObjectId: 'testSavedObjectId', id: contactCardEmbeddable.id },
    mockedByValueInput: { firstName: 'Kibanana', id: contactCardEmbeddable.id },
  });
  embeddable.updateInput({ viewMode: ViewMode.EDIT });
});

test('Unlink is compatible when embeddable on dashboard has reference type input', async () => {
  const action = new UnlinkFromLibraryAction();
  embeddable.updateInput(await embeddable.getInputAsRefType());
  expect(await action.isCompatible({ embeddable })).toBe(true);
});

test('Unlink is not compatible when embeddable input is by value', async () => {
  const action = new UnlinkFromLibraryAction();
  embeddable.updateInput(await embeddable.getInputAsValueType());
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Unlink is not compatible when view mode is set to view', async () => {
  const action = new UnlinkFromLibraryAction();
  embeddable.updateInput(await embeddable.getInputAsRefType());
  embeddable.updateInput({ viewMode: ViewMode.VIEW });
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Unlink is not compatible when embeddable is not in a dashboard container', async () => {
  let orphanContactCard = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Orphan',
  });
  orphanContactCard = embeddablePluginMock.mockRefOrValEmbeddable<
    ContactCardEmbeddable,
    ContactCardEmbeddableInput
  >(orphanContactCard, {
    mockedByReferenceInput: { savedObjectId: 'test', id: orphanContactCard.id },
    mockedByValueInput: { firstName: 'Kibanana', id: orphanContactCard.id },
  });
  const action = new UnlinkFromLibraryAction();
  expect(await action.isCompatible({ embeddable: orphanContactCard })).toBe(false);
});

test('Unlink replaces embeddableId but retains panel count', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  const action = new UnlinkFromLibraryAction();
  await action.execute({ embeddable });
  expect(Object.keys(container.getInput().panels).length).toEqual(originalPanelCount);

  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(embeddable.type);
});

test('Unlink unwraps all attributes from savedObject', async () => {
  const complicatedAttributes = {
    attribute1: 'The best attribute',
    attribute2: 22,
    attribute3: ['array', 'of', 'strings'],
    attribute4: { nestedattribute: 'hello from the nest' },
  };

  embeddable = embeddablePluginMock.mockRefOrValEmbeddable<
    ContactCardEmbeddable,
    { attributes: unknown; id: string },
    SavedObjectEmbeddableInput
  >(embeddable, {
    mockedByReferenceInput: { savedObjectId: 'testSavedObjectId', id: embeddable.id },
    mockedByValueInput: { attributes: complicatedAttributes, id: embeddable.id },
  });
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  const action = new UnlinkFromLibraryAction();
  await action.execute({ embeddable });
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(embeddable.type);
  expect(newPanel.explicitInput.attributes).toEqual(complicatedAttributes);
});
