/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import {
  buildMockDashboard,
  getMockedDashboardServices,
  setStubDashboardServices,
} from '@kbn/dashboard-plugin/public/mocks';
import { EmbeddableInput, ErrorEmbeddable, IContainer } from '../..';
import { core } from '../../../kibana_services';
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
import { canLinkLegacyEmbeddable, linkLegacyEmbeddable } from './link_legacy_embeddable';

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;
const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);

const defaultCapabilities = {
  advancedSettings: {},
  visualize: { save: true },
  maps: { save: true },
  navLinks: {},
};

Object.defineProperty(core.application, 'capabilities', {
  value: defaultCapabilities,
});

beforeAll(() => {
  setStubDashboardServices();
  const dashboardServices = getMockedDashboardServices();
  dashboardServices.embeddable.getEmbeddableFactory = jest.fn().mockReturnValue(embeddableFactory);
});

beforeEach(async () => {
  Object.defineProperty(core.application, 'capabilities', {
    value: defaultCapabilities,
  });

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

test('Cannot link an Error Embeddable to the library', async () => {
  const errorEmbeddable = new ErrorEmbeddable(
    'Wow what an awful error',
    { id: ' 404' },
    embeddable.getRoot() as IContainer
  );
  expect(await canLinkLegacyEmbeddable(errorEmbeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Cannot link an ES|QL Embeddable to the library', async () => {
  const filterableEmbeddable = embeddablePluginMock.mockFilterableEmbeddable(embeddable, {
    initialFilters: [],
    initialQuery: {
      esql: 'from logstash-* | limit 10',
    },
  });
  expect(
    await canLinkLegacyEmbeddable(filterableEmbeddable as unknown as CommonLegacyEmbeddable)
  ).toBe(false);
});

test('Cannot link a visualize embeddable to the library without visualize save permissions', async () => {
  Object.defineProperty(core.application, 'capabilities', {
    value: { ...defaultCapabilities, visualize: { save: false } },
  });
  expect(await canLinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Can link an embeddable to the library when it has value type input', async () => {
  embeddable.updateInput(await embeddable.getInputAsValueType());
  expect(await canLinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(true);
});

test('Cannot link an embedable when its input is by reference', async () => {
  embeddable.updateInput(await embeddable.getInputAsRefType());
  expect(await canLinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Cannot link an embedable when view mode is set to view', async () => {
  embeddable.updateInput(await embeddable.getInputAsRefType());
  embeddable.updateInput({ viewMode: ViewMode.VIEW });
  expect(await canLinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Cannot link an embedable when it is not a child of a Dashboard container', async () => {
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
});

test('Linking an embeddable replaces embeddableId and retains panel count', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));

  await linkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable);
  expect(Object.keys(container.getInput().panels).length).toEqual(originalPanelCount);

  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(embeddable.type);
});

test('Link legacy embeddable returns reference type input', async () => {
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
  await linkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable);
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(embeddable.type);
  expect((newPanel.explicitInput as unknown as { attributes: unknown }).attributes).toBeUndefined();
  expect(newPanel.explicitInput.savedObjectId).toBe('testSavedObjectId');
});
