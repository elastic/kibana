/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EmbeddableInput,
  ErrorEmbeddable,
  IContainer,
  isErrorEmbeddable,
  ReferenceOrValueEmbeddable,
  ViewMode,
} from '@kbn/embeddable-plugin/public';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';

import { getSampleDashboardInput } from '../mocks';
import { pluginServices } from '../services/plugin_services';
import { AddToLibraryAction } from './add_to_library_action';
import { DashboardContainer } from '../dashboard_container/embeddable/dashboard_container';

const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
pluginServices.getServices().embeddable.getEmbeddableFactory = jest
  .fn()
  .mockReturnValue(embeddableFactory);
let container: DashboardContainer;
let embeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;

const defaultCapabilities = {
  advancedSettings: {},
  visualize: { save: true },
  maps: { save: true },
  navLinks: {},
};

Object.defineProperty(pluginServices.getServices().application, 'capabilities', {
  value: defaultCapabilities,
});

beforeEach(async () => {
  pluginServices.getServices().application.capabilities = defaultCapabilities;

  container = new DashboardContainer(getSampleDashboardInput());
  await container.untilInitialized();

  const contactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Kibanana',
  });

  if (isErrorEmbeddable(contactCardEmbeddable)) {
    throw new Error('Failed to create embeddable');
  } else {
    embeddable = embeddablePluginMock.mockRefOrValEmbeddable<
      ContactCardEmbeddable,
      ContactCardEmbeddableInput
    >(contactCardEmbeddable, {
      mockedByReferenceInput: { savedObjectId: 'testSavedObjectId', id: contactCardEmbeddable.id },
      mockedByValueInput: { firstName: 'Kibanana', id: contactCardEmbeddable.id },
    });
    embeddable.updateInput({ viewMode: ViewMode.EDIT });
  }
});

test('Add to library is incompatible with Error Embeddables', async () => {
  const action = new AddToLibraryAction();
  const errorEmbeddable = new ErrorEmbeddable(
    'Wow what an awful error',
    { id: ' 404' },
    embeddable.getRoot() as IContainer
  );
  expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
});

test('Add to library is incompatible on visualize embeddable without visualize save permissions', async () => {
  pluginServices.getServices().application.capabilities = {
    ...defaultCapabilities,
    visualize: { save: false },
  };
  const action = new AddToLibraryAction();
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Add to library is compatible when embeddable on dashboard has value type input', async () => {
  const action = new AddToLibraryAction();
  embeddable.updateInput(await embeddable.getInputAsValueType());
  expect(await action.isCompatible({ embeddable })).toBe(true);
});

test('Add to library is not compatible when embeddable input is by reference', async () => {
  const action = new AddToLibraryAction();
  embeddable.updateInput(await embeddable.getInputAsRefType());
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Add to library is not compatible when view mode is set to view', async () => {
  const action = new AddToLibraryAction();
  embeddable.updateInput(await embeddable.getInputAsRefType());
  embeddable.updateInput({ viewMode: ViewMode.VIEW });
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Add to library is not compatible when embeddable is not in a dashboard container', async () => {
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
  const action = new AddToLibraryAction();
  expect(await action.isCompatible({ embeddable: orphanContactCard })).toBe(false);
});

test('Add to library replaces embeddableId and retains panel count', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));

  const action = new AddToLibraryAction();
  await action.execute({ embeddable });
  expect(Object.keys(container.getInput().panels).length).toEqual(originalPanelCount);

  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(embeddable.type);
});

test('Add to library returns reference type input', async () => {
  const complicatedAttributes = {
    attribute1: 'The best attribute',
    attribute2: 22,
    attribute3: ['array', 'of', 'strings'],
    attribute4: { nestedattribute: 'hello from the nest' },
  };

  embeddable = embeddablePluginMock.mockRefOrValEmbeddable<ContactCardEmbeddable>(embeddable, {
    mockedByReferenceInput: { savedObjectId: 'testSavedObjectId', id: embeddable.id },
    mockedByValueInput: { attributes: complicatedAttributes, id: embeddable.id } as EmbeddableInput,
  });
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  const action = new AddToLibraryAction();
  await action.execute({ embeddable });
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(embeddable.type);
  expect((newPanel.explicitInput as unknown as { attributes: unknown }).attributes).toBeUndefined();
  expect(newPanel.explicitInput.savedObjectId).toBe('testSavedObjectId');
});
