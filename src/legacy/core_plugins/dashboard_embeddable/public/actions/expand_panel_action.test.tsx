/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

jest.mock('ui/capabilities', () => ({
  uiCapabilities: {
    visualize: {
      save: true,
    },
  },
}));

import { EmbeddableFactoryRegistry, isErrorEmbeddable } from 'plugins/embeddable_api';
import { ExpandPanelAction } from './expand_panel_action';
import {
  ContactCardEmbeddable,
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddableFactory,
} from '../../../embeddable_api/public/__test__/index';
import { DashboardContainer } from '../embeddable';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../__test__';

const embeddableFactories = new EmbeddableFactoryRegistry();
embeddableFactories.registerFactory(new ContactCardEmbeddableFactory());

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable;

beforeEach(async () => {
  container = new DashboardContainer(
    getSampleDashboardInput({
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          embeddableId: '123',
          explicitInput: { firstName: 'Sam' },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
    }),
    embeddableFactories
  );

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
      embeddable: new ContactCardEmbeddable({ firstName: 'sue', id: '123' }),
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
  expect(action.getIcon({ embeddable })).toBeDefined();
});
