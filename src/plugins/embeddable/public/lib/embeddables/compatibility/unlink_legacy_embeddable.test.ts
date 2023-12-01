/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardPanelState } from '@kbn/dashboard-plugin/common';
import { type DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import {
  buildMockDashboard,
  getMockedDashboardServices,
  setStubDashboardServices,
} from '@kbn/dashboard-plugin/public/mocks';
import { ErrorEmbeddable, IContainer, SavedObjectEmbeddableInput } from '../..';
import { embeddablePluginMock } from '../../../mocks';
import { ReferenceOrValueEmbeddable } from '../../reference_or_value_embeddable';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '../../test_samples';
import { ViewMode } from '../../types';
import { isErrorEmbeddable } from '../is_error_embeddable';
import { CommonLegacyEmbeddable } from './legacy_embeddable_to_api';
import { canLinkLegacyEmbeddable } from './link_legacy_embeddable';
import { canUnlinkLegacyEmbeddable, unlinkLegacyEmbeddable } from './unlink_legacy_embeddable';

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;

const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);

beforeAll(() => {
  setStubDashboardServices();
  const dashboardServices = getMockedDashboardServices();
  dashboardServices.embeddable.getEmbeddableFactory = jest.fn().mockReturnValue(embeddableFactory);
});

beforeEach(async () => {
  container = buildMockDashboard();

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

test('Can unlink returns false when given an Error Embeddable', async () => {
  const errorEmbeddable = new ErrorEmbeddable(
    'Wow what an awful error',
    { id: ' 404' },
    embeddable.getRoot() as IContainer
  );
  expect(
    await canUnlinkLegacyEmbeddable(errorEmbeddable as unknown as CommonLegacyEmbeddable)
  ).toBe(false);
});

test('Can unlink returns true when embeddable on dashboard has reference type input', async () => {
  embeddable.updateInput(await embeddable.getInputAsRefType());
  expect(await canUnlinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    true
  );
});

test('Can unlink returns false when embeddable input is by value', async () => {
  embeddable.updateInput(await embeddable.getInputAsValueType());
  expect(await canUnlinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Can unlink returns false when view mode is set to view', async () => {
  embeddable.updateInput(await embeddable.getInputAsRefType());
  embeddable.updateInput({ viewMode: ViewMode.VIEW });
  expect(await canUnlinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Can unlink returns false when embeddable is not in a dashboard container', async () => {
  let orphanContactCard = await embeddableFactory.create({
    id: 'orphanContact',
    firstName: 'Orphan',
  });

  orphanContactCard = embeddablePluginMock.mockRefOrValEmbeddable<
    ContactCardEmbeddable,
    ContactCardEmbeddableInput
  >(orphanContactCard, {
    mockedByReferenceInput: { savedObjectId: 'test', id: orphanContactCard.id },
    mockedByValueInput: { firstName: 'Kibanana', id: orphanContactCard.id },
  });
  expect(
    await canLinkLegacyEmbeddable(orphanContactCard as unknown as CommonLegacyEmbeddable)
  ).toBe(false);
  expect(await canUnlinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Unlink replaces embeddableId and retains panel count', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  await unlinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable);
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
  await unlinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable);
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!] as DashboardPanelState & {
    explicitInput: { attributes: unknown };
  };
  expect(newPanel.type).toEqual(embeddable.type);
  expect((newPanel.explicitInput as { attributes: unknown }).attributes).toEqual(
    complicatedAttributes
  );
});
