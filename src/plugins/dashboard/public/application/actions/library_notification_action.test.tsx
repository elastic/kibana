/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DashboardContainer } from '../embeddable';
import { getSampleDashboardInput } from '../test_helpers';

import { coreMock, uiSettingsServiceMock } from '../../../../../core/public/mocks';
import { CoreStart } from 'kibana/public';
import { LibraryNotificationAction, UnlinkFromLibraryAction } from '.';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';
import {
  ErrorEmbeddable,
  IContainer,
  isErrorEmbeddable,
  ReferenceOrValueEmbeddable,
  ViewMode,
} from '../../services/embeddable';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '../../services/embeddable_test_samples';

const { setup, doStart } = embeddablePluginMock.createInstance();
setup.registerEmbeddableFactory(
  CONTACT_CARD_EMBEDDABLE,
  new ContactCardEmbeddableFactory((() => null) as any, {} as any)
);
const start = doStart();

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;
let coreStart: CoreStart;
let unlinkAction: UnlinkFromLibraryAction;

beforeEach(async () => {
  coreStart = coreMock.createStart();

  unlinkAction = ({
    getDisplayName: () => 'unlink from dat library',
    execute: jest.fn(),
  } as unknown) as UnlinkFromLibraryAction;

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

test('Notification is incompatible with Error Embeddables', async () => {
  const action = new LibraryNotificationAction(unlinkAction);
  const errorEmbeddable = new ErrorEmbeddable(
    'Wow what an awful error',
    { id: ' 404' },
    embeddable.getRoot() as IContainer
  );
  expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
});

test('Notification is shown when embeddable on dashboard has reference type input', async () => {
  const action = new LibraryNotificationAction(unlinkAction);
  embeddable.updateInput(await embeddable.getInputAsRefType());
  expect(await action.isCompatible({ embeddable })).toBe(true);
});

test('Notification is not shown when embeddable input is by value', async () => {
  const action = new LibraryNotificationAction(unlinkAction);
  embeddable.updateInput(await embeddable.getInputAsValueType());
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Notification is not shown when view mode is set to view', async () => {
  const action = new LibraryNotificationAction(unlinkAction);
  embeddable.updateInput(await embeddable.getInputAsRefType());
  embeddable.updateInput({ viewMode: ViewMode.VIEW });
  expect(await action.isCompatible({ embeddable })).toBe(false);
});
