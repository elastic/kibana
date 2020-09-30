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
import { isErrorEmbeddable } from '../../embeddable_plugin';
import { ReplacePanelAction } from './replace_panel_action';
import { DashboardContainer } from '../embeddable';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../../embeddable_plugin_test_samples';
import { coreMock } from '../../../../../core/public/mocks';
import { CoreStart } from 'kibana/public';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';

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
