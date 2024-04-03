/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { isErrorEmbeddable, ReferenceOrValueEmbeddable } from '@kbn/embeddable-plugin/public';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { duplicateDashboardPanel, incrementPanelTitle } from './duplicate_dashboard_panel';
import { buildMockDashboard, getSampleDashboardPanel } from '../../../mocks';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardContainer } from '../dashboard_container';

let container: DashboardContainer;
let genericEmbeddable: ContactCardEmbeddable;
let byRefOrValEmbeddable: ContactCardEmbeddable & ReferenceOrValueEmbeddable;
let coreStart: CoreStart;
beforeEach(async () => {
  coreStart = coreMock.createStart();
  coreStart.savedObjects.client = {
    ...coreStart.savedObjects.client,
    get: jest.fn().mockImplementation(() => ({ attributes: { title: 'Holy moly' } })),
    find: jest.fn().mockImplementation(() => ({ total: 15 })),
    create: jest.fn().mockImplementation(() => ({ id: 'brandNewSavedObject' })),
  };

  const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);

  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(mockEmbeddableFactory);
  container = buildMockDashboard({
    overrides: {
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Kibanana', id: '123' },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
    },
  });

  const refOrValContactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'RefOrValEmbeddable',
  });

  const nonRefOrValueContactCard = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Not a refOrValEmbeddable',
  });

  if (
    isErrorEmbeddable(refOrValContactCardEmbeddable) ||
    isErrorEmbeddable(nonRefOrValueContactCard)
  ) {
    throw new Error('Failed to create embeddables');
  } else {
    genericEmbeddable = nonRefOrValueContactCard;
    byRefOrValEmbeddable = embeddablePluginMock.mockRefOrValEmbeddable<
      ContactCardEmbeddable,
      ContactCardEmbeddableInput
    >(refOrValContactCardEmbeddable, {
      mockedByReferenceInput: {
        savedObjectId: 'testSavedObjectId',
        id: refOrValContactCardEmbeddable.id,
      },
      mockedByValueInput: { firstName: 'RefOrValEmbeddable', id: refOrValContactCardEmbeddable.id },
    });
    jest.spyOn(byRefOrValEmbeddable, 'getInputAsValueType');
  }
});

test('Duplication adds a new embeddable', async () => {
  const originalPanelCount = Object.keys(container.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(container.getInput().panels));
  await duplicateDashboardPanel.bind(container)(byRefOrValEmbeddable.id);

  expect(Object.keys(container.getInput().panels).length).toEqual(originalPanelCount + 1);
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(byRefOrValEmbeddable.type);
});

test('Duplicates a RefOrVal embeddable by value', async () => {
  const originalPanelKeySet = new Set(Object.keys(container.getInput().panels));
  await duplicateDashboardPanel.bind(container)(byRefOrValEmbeddable.id);
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );

  const originalFirstName = (
    container.getInput().panels[byRefOrValEmbeddable.id].explicitInput as ContactCardEmbeddableInput
  ).firstName;

  const newFirstName = (
    container.getInput().panels[newPanelId!].explicitInput as ContactCardEmbeddableInput
  ).firstName;

  expect(byRefOrValEmbeddable.getInputAsValueType).toHaveBeenCalled();

  expect(originalFirstName).toEqual(newFirstName);
  expect(container.getInput().panels[newPanelId!].type).toEqual(byRefOrValEmbeddable.type);
});

test('Duplicates a non RefOrVal embeddable by value', async () => {
  const originalPanelKeySet = new Set(Object.keys(container.getInput().panels));
  await duplicateDashboardPanel.bind(container)(genericEmbeddable.id);
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );

  const originalFirstName = (
    container.getInput().panels[genericEmbeddable.id].explicitInput as ContactCardEmbeddableInput
  ).firstName;

  const newFirstName = (
    container.getInput().panels[newPanelId!].explicitInput as ContactCardEmbeddableInput
  ).firstName;

  expect(originalFirstName).toEqual(newFirstName);
  expect(container.getInput().panels[newPanelId!].type).toEqual(genericEmbeddable.type);
});

test('Gets a unique title from the dashboard', async () => {
  expect(await incrementPanelTitle(container, '')).toEqual('');

  container.getPanelTitles = jest.fn().mockImplementation(() => {
    return ['testDuplicateTitle', 'testDuplicateTitle (copy)', 'testUniqueTitle'];
  });
  expect(await incrementPanelTitle(container, 'testUniqueTitle')).toEqual('testUniqueTitle (copy)');
  expect(await incrementPanelTitle(container, 'testDuplicateTitle')).toEqual(
    'testDuplicateTitle (copy 1)'
  );

  container.getPanelTitles = jest.fn().mockImplementation(() => {
    return ['testDuplicateTitle', 'testDuplicateTitle (copy)'].concat(
      Array.from([...Array(39)], (_, index) => `testDuplicateTitle (copy ${index + 1})`)
    );
  });
  expect(await incrementPanelTitle(container, 'testDuplicateTitle')).toEqual(
    'testDuplicateTitle (copy 40)'
  );
  expect(await incrementPanelTitle(container, 'testDuplicateTitle (copy 100)')).toEqual(
    'testDuplicateTitle (copy 40)'
  );

  container.getPanelTitles = jest.fn().mockImplementation(() => {
    return ['testDuplicateTitle (copy 100)'];
  });
  expect(await incrementPanelTitle(container, 'testDuplicateTitle')).toEqual(
    'testDuplicateTitle (copy 101)'
  );
  expect(await incrementPanelTitle(container, 'testDuplicateTitle (copy 100)')).toEqual(
    'testDuplicateTitle (copy 101)'
  );
});
