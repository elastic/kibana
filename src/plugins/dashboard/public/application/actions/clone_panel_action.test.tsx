/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardPanelState } from '../embeddable';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';

import { coreMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { CoreStart } from '@kbn/core/public';
import { ClonePanelAction } from '.';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '../../services/embeddable_test_samples';
import { ErrorEmbeddable, IContainer, isErrorEmbeddable } from '../../services/embeddable';
import { getStubPluginServices } from '@kbn/presentation-util-plugin/public';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';

const { setup, doStart } = embeddablePluginMock.createInstance();
setup.registerEmbeddableFactory(
  CONTACT_CARD_EMBEDDABLE,
  new ContactCardEmbeddableFactory((() => null) as any, {} as any)
);
const start = doStart();

let container: DashboardContainer;
let byRefOrValEmbeddable: ContactCardEmbeddable;
let genericEmbeddable: ContactCardEmbeddable;
let coreStart: CoreStart;
beforeEach(async () => {
  coreStart = coreMock.createStart();
  coreStart.savedObjects.client = {
    ...coreStart.savedObjects.client,
    get: jest.fn().mockImplementation(() => ({ attributes: { title: 'Holy moly' } })),
    find: jest.fn().mockImplementation(() => ({ total: 15 })),
    create: jest.fn().mockImplementation(() => ({ id: 'brandNewSavedObject' })),
  };

  const options = {
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
  const input = getSampleDashboardInput({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Kibanana', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });
  container = new DashboardContainer(input, options);

  const refOrValContactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'RefOrValEmbeddable',
  });
  const genericContactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'NotRefOrValEmbeddable',
  });

  if (
    isErrorEmbeddable(refOrValContactCardEmbeddable) ||
    isErrorEmbeddable(genericContactCardEmbeddable)
  ) {
    throw new Error('Failed to create embeddables');
  } else {
    byRefOrValEmbeddable = embeddablePluginMock.mockRefOrValEmbeddable<
      ContactCardEmbeddable,
      ContactCardEmbeddableInput
    >(refOrValContactCardEmbeddable, {
      mockedByReferenceInput: {
        savedObjectId: 'testSavedObjectId',
        id: refOrValContactCardEmbeddable.id,
      },
      mockedByValueInput: { firstName: 'Kibanana', id: refOrValContactCardEmbeddable.id },
    });
    genericEmbeddable = genericContactCardEmbeddable;
  }
});

test('Clone is incompatible with Error Embeddables', async () => {
  const action = new ClonePanelAction(coreStart);
  const errorEmbeddable = new ErrorEmbeddable(
    'Wow what an awful error',
    { id: ' 404' },
    byRefOrValEmbeddable.getRoot() as IContainer
  );
  expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
});

test('Clone adds a new embeddable', async () => {
  const dashboard = byRefOrValEmbeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  const action = new ClonePanelAction(coreStart);
  await action.execute({ embeddable: byRefOrValEmbeddable });
  expect(Object.keys(container.getInput().panels).length).toEqual(originalPanelCount + 1);
  const newPanelId = Object.keys(container.getInput().panels).find(
    (key) => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual('placeholder');
  // let the placeholder load
  await dashboard.untilEmbeddableLoaded(newPanelId!);
  await new Promise((r) => process.nextTick(r)); // Allow the current loop of the event loop to run to completion
  // now wait for the full embeddable to replace it
  const loadedPanel = await dashboard.untilEmbeddableLoaded(newPanelId!);
  expect(loadedPanel.type).toEqual(byRefOrValEmbeddable.type);
});

test('Clones a RefOrVal embeddable by value', async () => {
  const dashboard = byRefOrValEmbeddable.getRoot() as IContainer;
  const panel = dashboard.getInput().panels[byRefOrValEmbeddable.id] as DashboardPanelState;
  const action = new ClonePanelAction(coreStart);
  // @ts-ignore
  const newPanel = await action.cloneEmbeddable(panel, byRefOrValEmbeddable);
  expect(coreStart.savedObjects.client.get).toHaveBeenCalledTimes(0);
  expect(coreStart.savedObjects.client.find).toHaveBeenCalledTimes(0);
  expect(coreStart.savedObjects.client.create).toHaveBeenCalledTimes(0);
  expect(newPanel.type).toEqual(byRefOrValEmbeddable.type);
});

test('Clones a non-RefOrVal embeddable by value if the panel does not have a savedObjectId', async () => {
  const dashboard = genericEmbeddable.getRoot() as IContainer;
  const panel = dashboard.getInput().panels[genericEmbeddable.id] as DashboardPanelState;
  const action = new ClonePanelAction(coreStart);
  // @ts-ignore
  const newPanelWithoutId = await action.cloneEmbeddable(panel, genericEmbeddable);
  expect(coreStart.savedObjects.client.get).toHaveBeenCalledTimes(0);
  expect(coreStart.savedObjects.client.find).toHaveBeenCalledTimes(0);
  expect(coreStart.savedObjects.client.create).toHaveBeenCalledTimes(0);
  expect(newPanelWithoutId.type).toEqual(genericEmbeddable.type);
});

test('Clones a non-RefOrVal embeddable by reference if the panel has a savedObjectId', async () => {
  const dashboard = genericEmbeddable.getRoot() as IContainer;
  const panel = dashboard.getInput().panels[genericEmbeddable.id] as DashboardPanelState;
  panel.explicitInput.savedObjectId = 'holySavedObjectBatman';
  const action = new ClonePanelAction(coreStart);
  // @ts-ignore
  const newPanel = await action.cloneEmbeddable(panel, genericEmbeddable);
  expect(coreStart.savedObjects.client.get).toHaveBeenCalledTimes(1);
  expect(coreStart.savedObjects.client.find).toHaveBeenCalledTimes(1);
  expect(coreStart.savedObjects.client.create).toHaveBeenCalledTimes(1);
  expect(newPanel.type).toEqual(genericEmbeddable.type);
});

test('Gets a unique title from the saved objects library', async () => {
  const dashboard = genericEmbeddable.getRoot() as IContainer;
  const panel = dashboard.getInput().panels[genericEmbeddable.id] as DashboardPanelState;
  panel.explicitInput.savedObjectId = 'holySavedObjectBatman';
  coreStart.savedObjects.client.find = jest.fn().mockImplementation(({ search }) => {
    if (search === '"testFirstClone"') {
      return {
        savedObjects: [
          {
            attributes: { title: 'testFirstClone' },
            get: jest.fn().mockReturnValue('testFirstClone'),
          },
        ],
        total: 1,
      };
    } else if (search === '"testBeforePageLimit"') {
      return {
        savedObjects: [
          {
            attributes: { title: 'testBeforePageLimit (copy 9)' },
            get: jest.fn().mockReturnValue('testBeforePageLimit (copy 9)'),
          },
        ],
        total: 10,
      };
    } else if (search === '"testMaxLogic"') {
      return {
        savedObjects: [
          {
            attributes: { title: 'testMaxLogic (copy 10000)' },
            get: jest.fn().mockReturnValue('testMaxLogic (copy 10000)'),
          },
        ],
        total: 2,
      };
    } else if (search === '"testAfterPageLimit"') {
      return { total: 11 };
    }
  });

  const action = new ClonePanelAction(coreStart);
  // @ts-ignore
  expect(await action.getCloneTitle(genericEmbeddable, 'testFirstClone')).toEqual(
    'testFirstClone (copy)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(genericEmbeddable, 'testBeforePageLimit')).toEqual(
    'testBeforePageLimit (copy 10)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(genericEmbeddable, 'testBeforePageLimit (copy 9)')).toEqual(
    'testBeforePageLimit (copy 10)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(genericEmbeddable, 'testMaxLogic')).toEqual(
    'testMaxLogic (copy 10001)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(genericEmbeddable, 'testAfterPageLimit')).toEqual(
    'testAfterPageLimit (copy 11)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(genericEmbeddable, 'testAfterPageLimit (copy 10)')).toEqual(
    'testAfterPageLimit (copy 11)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(genericEmbeddable, 'testAfterPageLimit (copy 10000)')).toEqual(
    'testAfterPageLimit (copy 11)'
  );
});

test('Gets a unique title from the dashboard', async () => {
  const dashboard = genericEmbeddable.getRoot() as DashboardContainer;
  const action = new ClonePanelAction(coreStart);

  // @ts-ignore
  expect(await action.getCloneTitle(byRefOrValEmbeddable, '')).toEqual('');

  dashboard.getPanelTitles = jest.fn().mockImplementation(() => {
    return ['testDuplicateTitle', 'testDuplicateTitle (copy)', 'testUniqueTitle'];
  });
  // @ts-ignore
  expect(await action.getCloneTitle(byRefOrValEmbeddable, 'testUniqueTitle')).toEqual(
    'testUniqueTitle (copy)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(byRefOrValEmbeddable, 'testDuplicateTitle')).toEqual(
    'testDuplicateTitle (copy 1)'
  );

  dashboard.getPanelTitles = jest.fn().mockImplementation(() => {
    return ['testDuplicateTitle', 'testDuplicateTitle (copy)'].concat(
      Array.from([...Array(39)], (_, index) => `testDuplicateTitle (copy ${index + 1})`)
    );
  });
  // @ts-ignore
  expect(await action.getCloneTitle(byRefOrValEmbeddable, 'testDuplicateTitle')).toEqual(
    'testDuplicateTitle (copy 40)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(byRefOrValEmbeddable, 'testDuplicateTitle (copy 100)')).toEqual(
    'testDuplicateTitle (copy 40)'
  );

  dashboard.getPanelTitles = jest.fn().mockImplementation(() => {
    return ['testDuplicateTitle (copy 100)'];
  });
  // @ts-ignore
  expect(await action.getCloneTitle(byRefOrValEmbeddable, 'testDuplicateTitle')).toEqual(
    'testDuplicateTitle (copy 101)'
  );
  // @ts-ignore
  expect(await action.getCloneTitle(byRefOrValEmbeddable, 'testDuplicateTitle (copy 100)')).toEqual(
    'testDuplicateTitle (copy 101)'
  );
});
