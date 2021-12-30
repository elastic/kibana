/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardContainer } from '../embeddable/dashboard_container';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';

import { coreMock, uiSettingsServiceMock } from '../../../../../core/public/mocks';
import { CoreStart } from 'kibana/public';
import { ClonePanelAction } from '.';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '../../services/embeddable_test_samples';
import { ErrorEmbeddable, IContainer, isErrorEmbeddable } from '../../services/embeddable';
import { getStubPluginServices } from '../../../../presentation_util/public';
import { screenshotModePluginMock } from '../../../../screenshot_mode/public/mocks';

const { setup, doStart } = embeddablePluginMock.createInstance();
setup.registerEmbeddableFactory(
  CONTACT_CARD_EMBEDDABLE,
  new ContactCardEmbeddableFactory((() => null) as any, {} as any)
);
const start = doStart();

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable;
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

  const contactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Kibana',
  });

  if (isErrorEmbeddable(contactCardEmbeddable)) {
    throw new Error('Failed to create embeddable');
  } else {
    embeddable = contactCardEmbeddable;
  }
});

test('Clone is incompatible with Error Embeddables', async () => {
  const action = new ClonePanelAction(coreStart);
  const errorEmbeddable = new ErrorEmbeddable(
    'Wow what an awful error',
    { id: ' 404' },
    embeddable.getRoot() as IContainer
  );
  expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
});

test('Clone adds a new embeddable', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  const action = new ClonePanelAction(coreStart);
  await action.execute({ embeddable });
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
  expect(loadedPanel.type).toEqual(embeddable.type);
});
