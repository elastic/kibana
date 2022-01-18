/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReplacePanelAction } from './replace_panel_action';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';

import { coreMock, uiSettingsServiceMock } from '../../../../../core/public/mocks';
import { CoreStart } from 'kibana/public';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';
import { isErrorEmbeddable } from '../../services/embeddable';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
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
let embeddable: ContactCardEmbeddable;
let coreStart: CoreStart;
beforeEach(async () => {
  coreStart = coreMock.createStart();
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
        explicitInput: { firstName: 'Sam', id: '123' },
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

test('Executes the replace panel action', async () => {
  let SavedObjectFinder: any;
  let notifications: any;
  const action = new ReplacePanelAction(
    coreStart,
    SavedObjectFinder,
    notifications,
    start.getEmbeddableFactories
  );
  action.execute({ embeddable });
});

test('Is not compatible when embeddable is not in a dashboard container', async () => {
  let SavedObjectFinder: any;
  let notifications: any;
  const action = new ReplacePanelAction(
    coreStart,
    SavedObjectFinder,
    notifications,
    start.getEmbeddableFactories
  );
  expect(
    await action.isCompatible({
      embeddable: new ContactCardEmbeddable(
        { firstName: 'sue', id: '123' },
        { execAction: (() => null) as any }
      ),
    })
  ).toBe(false);
});

test('Execute throws an error when called with an embeddable not in a parent', async () => {
  let SavedObjectFinder: any;
  let notifications: any;
  const action = new ReplacePanelAction(
    coreStart,
    SavedObjectFinder,
    notifications,
    start.getEmbeddableFactories
  );
  async function check() {
    await action.execute({ embeddable: container });
  }
  await expect(check()).rejects.toThrow(Error);
});

test('Returns title', async () => {
  let SavedObjectFinder: any;
  let notifications: any;
  const action = new ReplacePanelAction(
    coreStart,
    SavedObjectFinder,
    notifications,
    start.getEmbeddableFactories
  );
  expect(action.getDisplayName({ embeddable })).toBeDefined();
});

test('Returns an icon', async () => {
  let SavedObjectFinder: any;
  let notifications: any;
  const action = new ReplacePanelAction(
    coreStart,
    SavedObjectFinder,
    notifications,
    start.getEmbeddableFactories
  );
  expect(action.getIconType({ embeddable })).toBeDefined();
});
