/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { ReplacePanelAction } from './replace_panel_action';
import { pluginServices } from '../services/plugin_services';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../mocks';
import { DashboardContainer } from '../dashboard_container/embeddable/dashboard_container';

const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
pluginServices.getServices().embeddable.getEmbeddableFactory = jest
  .fn()
  .mockReturnValue(mockEmbeddableFactory);

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable;
beforeEach(async () => {
  const input = getSampleDashboardInput({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });
  container = new DashboardContainer(input);

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
  const action = new ReplacePanelAction(SavedObjectFinder);
  action.execute({ embeddable });
});

test('Is not compatible when embeddable is not in a dashboard container', async () => {
  let SavedObjectFinder: any;
  const action = new ReplacePanelAction(SavedObjectFinder);
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
  const action = new ReplacePanelAction(SavedObjectFinder);
  async function check() {
    await action.execute({ embeddable: container });
  }
  await expect(check()).rejects.toThrow(Error);
});

test('Returns title', async () => {
  let SavedObjectFinder: any;
  const action = new ReplacePanelAction(SavedObjectFinder);
  expect(action.getDisplayName({ embeddable })).toBeDefined();
});

test('Returns an icon', async () => {
  let SavedObjectFinder: any;
  const action = new ReplacePanelAction(SavedObjectFinder);
  expect(action.getIconType({ embeddable })).toBeDefined();
});
