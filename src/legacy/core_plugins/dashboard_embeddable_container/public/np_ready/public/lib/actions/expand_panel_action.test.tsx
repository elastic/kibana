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

import { isErrorEmbeddable, EmbeddableFactory, GetEmbeddableFactory } from '../embeddable_api';
import { ExpandPanelAction } from './expand_panel_action';
import { DashboardContainer } from '../embeddable';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../../../../../embeddable_api/public/np_ready/public/lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../../../../../../embeddable_api/public/np_ready/public/lib/test_samples/embeddables/contact_card/contact_card_embeddable';

const __embeddableFactories = new Map<string, EmbeddableFactory>();
__embeddableFactories.set(
  CONTACT_CARD_EMBEDDABLE,
  new ContactCardEmbeddableFactory({} as any, (() => null) as any, {} as any)
);
const getEmbeddableFactory: GetEmbeddableFactory = (id: string) => __embeddableFactories.get(id);

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable;

beforeEach(async () => {
  container = new DashboardContainer(
    getSampleDashboardInput({
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Sam', id: '123' },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
    }),
    { getEmbeddableFactory } as any
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
  expect(action.getIcon({ embeddable })).toBeDefined();
});
