/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpandPanelAction } from './expand_panel_action';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';

import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { isErrorEmbeddable } from '../../services/embeddable';
import { getStubPluginServices } from '@kbn/presentation-util-plugin/public';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';

import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../../services/embeddable_test_samples';
import { coreMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';

const { setup, doStart } = embeddablePluginMock.createInstance();

setup.registerEmbeddableFactory(
  CONTACT_CARD_EMBEDDABLE,
  new ContactCardEmbeddableFactory((() => null) as any, {} as any)
);
const start = doStart();

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable;

beforeEach(async () => {
  const options = {
    ExitFullScreenButton: () => null,
    SavedObjectFinder: () => null,
    application: {} as any,
    embeddable: start,
    inspector: {} as any,
    notifications: {} as any,
    overlays: {} as any,
    savedObjectMetaData: {} as any,
    uiActions: {} as any,
    uiSettings: uiSettingsServiceMock.createStartContract(),
    http: coreMock.createStart().http,
    theme: coreMock.createStart().theme,
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

test('Sets the embeddable expanded panel id on the parent', async () => {
  const expandPanelAction = new ExpandPanelAction();

  expect(container.getInput().expandedPanelId).toBeUndefined();

  expandPanelAction.execute({ embeddable });

  expect(container.getInput().expandedPanelId).toBe(embeddable.id);
});

test('Is not compatible when embeddable is not in a dashboard container', async () => {
  const action = new ExpandPanelAction();
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
  const action = new ExpandPanelAction();
  async function check() {
    await action.execute({ embeddable: container });
  }
  await expect(check()).rejects.toThrow(Error);
});

test('Returns title', async () => {
  const action = new ExpandPanelAction();
  expect(action.getDisplayName({ embeddable })).toBeDefined();
});

test('Returns an icon', async () => {
  const action = new ExpandPanelAction();
  expect(action.getIconType({ embeddable })).toBeDefined();
});
