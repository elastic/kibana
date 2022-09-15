/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSampleDashboardInput } from '../test_helpers';
import { DashboardContainer } from '../embeddable/dashboard_container';

import { LibraryNotificationAction, UnlinkFromLibraryAction } from '.';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import {
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
import { pluginServices } from '../../services/plugin_services';

const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
pluginServices.getServices().embeddable.getEmbeddableFactory = jest
  .fn()
  .mockReturnValue(mockEmbeddableFactory);

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;
let unlinkAction: UnlinkFromLibraryAction;

beforeEach(async () => {
  unlinkAction = {
    getDisplayName: () => 'unlink from dat library',
    execute: jest.fn(),
  } as unknown as UnlinkFromLibraryAction;

  container = new DashboardContainer(getSampleDashboardInput());

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
