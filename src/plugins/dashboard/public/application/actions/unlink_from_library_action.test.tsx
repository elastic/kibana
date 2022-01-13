/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from 'kibana/public';

import {
  ViewMode,
  IContainer,
  ErrorEmbeddable,
  isErrorEmbeddable,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
} from '../../services/embeddable';
import { UnlinkFromLibraryAction } from '.';
import { getSampleDashboardInput } from '../test_helpers';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { coreMock, uiSettingsServiceMock } from '../../../../../core/public/mocks';

import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '../../services/embeddable_test_samples';
import { getStubPluginServices } from '../../../../presentation_util/public';
import { screenshotModePluginMock } from '../../../../screenshot_mode/public/mocks';

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
    uiSettings: uiSettingsServiceMock.createStartContract(),
    http: coreStart.http,
    theme: coreStart.theme,
    presentationUtil: getStubPluginServices(),
    screenshotMode: screenshotModePluginMock.createSetupContract(),
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

test('Unlink is incompatible with Error Embeddables', async () => {
  const action = new UnlinkFromLibraryAction({ toasts: coreStart.notifications.toasts });
  const errorEmbeddable = new ErrorEmbeddable(
    'Wow what an awful error',
    { id: ' 404' },
    embeddable.getRoot() as IContainer
  );
  expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
});

test('Unlink is compatible when embeddable on dashboard has reference type input', async () => {
  const action = new UnlinkFromLibraryAction({ toasts: coreStart.notifications.toasts });
  embeddable.updateInput(await embeddable.getInputAsRefType());
  expect(await action.isCompatible({ embeddable })).toBe(true);
});

test('Unlink is not compatible when embeddable input is by value', async () => {
  const action = new UnlinkFromLibraryAction({ toasts: coreStart.notifications.toasts });
  embeddable.updateInput(await embeddable.getInputAsValueType());
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Unlink is not compatible when view mode is set to view', async () => {
  const action = new UnlinkFromLibraryAction({ toasts: coreStart.notifications.toasts });
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
  const action = new UnlinkFromLibraryAction({ toasts: coreStart.notifications.toasts });
  expect(await action.isCompatible({ embeddable: orphanContactCard })).toBe(false);
});

test('Unlink replaces embeddableId and retains panel count', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  const action = new UnlinkFromLibraryAction({ toasts: coreStart.notifications.toasts });
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
  const action = new UnlinkFromLibraryAction({ toasts: coreStart.notifications.toasts });
  await action.execute({ embeddable });
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(embeddable.type);
  expect(newPanel.explicitInput.attributes).toEqual(complicatedAttributes);
});
