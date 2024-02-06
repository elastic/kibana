/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput, ErrorEmbeddable, IContainer, SavedObjectEmbeddableInput } from '../..';
import { core } from '../../../kibana_services';
import { embeddablePluginMock } from '../../../mocks';
import { createHelloWorldContainerAndEmbeddable } from '../../../tests/helpers';
import { ReferenceOrValueEmbeddable } from '../../reference_or_value_embeddable';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
} from '../../test_samples';
import { ViewMode } from '../../types';
import { CommonLegacyEmbeddable } from './legacy_embeddable_to_api';
import { canLinkLegacyEmbeddable, linkLegacyEmbeddable } from './link_legacy_embeddable';

let container: IContainer;
let embeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;
const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);

const defaultCapabilities = {
  advancedSettings: {},
  visualize: { save: true },
  maps: { save: true },
  navLinks: {},
};

beforeEach(async () => {
  const result = await createHelloWorldContainerAndEmbeddable();
  container = result.container;
  embeddable = embeddablePluginMock.mockRefOrValEmbeddable<
    ContactCardEmbeddable,
    ContactCardEmbeddableInput
  >(result.embeddable, {
    mockedByReferenceInput: { savedObjectId: 'testSavedObjectId', id: result.embeddable.id },
    mockedByValueInput: { firstName: 'Kibanana', id: result.embeddable.id },
  });
  embeddable.updateInput({ viewMode: ViewMode.EDIT });
});

const assignDefaultCapabilities = () => {
  Object.defineProperty(core.application, 'capabilities', {
    value: defaultCapabilities,
  });
};

test('Cannot link an Error Embeddable to the library', async () => {
  assignDefaultCapabilities();
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
  assignDefaultCapabilities();
  const filterableEmbeddable = embeddablePluginMock.mockFilterableEmbeddable(embeddable, {
    getFilters: () => [],
    getQuery: () => ({
      esql: 'from logstash-* | limit 10',
    }),
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
  assignDefaultCapabilities();
  embeddable.updateInput(await embeddable.getInputAsValueType());
  expect(await canLinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(true);
});

test('Cannot link an embedable when its input is by reference', async () => {
  assignDefaultCapabilities();
  embeddable.updateInput(await embeddable.getInputAsRefType());
  expect(await canLinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Cannot link an embedable when view mode is set to view', async () => {
  assignDefaultCapabilities();
  embeddable.updateInput(await embeddable.getInputAsRefType());
  embeddable.updateInput({ viewMode: ViewMode.VIEW });
  expect(await canLinkLegacyEmbeddable(embeddable as unknown as CommonLegacyEmbeddable)).toBe(
    false
  );
});

test('Cannot link an embedable when it is not a child of a Dashboard container', async () => {
  assignDefaultCapabilities();
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
  assignDefaultCapabilities();
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
  assignDefaultCapabilities();
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
  expect((newPanel.explicitInput as SavedObjectEmbeddableInput).savedObjectId).toBe(
    'testSavedObjectId'
  );
});
