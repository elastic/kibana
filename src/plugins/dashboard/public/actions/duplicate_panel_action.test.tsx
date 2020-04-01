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
import { isErrorEmbeddable, EmbeddableFactory, IContainer } from '../embeddable_plugin';
import { DashboardContainer } from '../embeddable';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../embeddable_plugin_test_samples';
import { coreMock } from '../../../../core/public/mocks';
import { CoreStart } from 'kibana/public';
import { DuplicatePanelAction } from '.';

const embeddableFactories = new Map<string, EmbeddableFactory>();
embeddableFactories.set(
  CONTACT_CARD_EMBEDDABLE,
  new ContactCardEmbeddableFactory({} as any, (() => null) as any, {} as any)
);
// const getEmbeddableFactories = () => embeddableFactories.values();

let container: DashboardContainer;
let embeddable: ContactCardEmbeddable;
let coreStart: CoreStart;
beforeEach(async () => {
  coreStart = coreMock.createStart();
  const options = {
    ExitFullScreenButton: () => null,
    SavedObjectFinder: () => null,
    application: {} as any,
    embeddable: {
      getEmbeddableFactory: (id: string) => embeddableFactories.get(id)!,
    } as any,
    inspector: {} as any,
    notifications: {} as any,
    overlays: coreStart.overlays,
    savedObjectMetaData: {} as any,
    uiActions: {} as any,
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

test('Duplicates an embeddable without a saved object ID', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const action = new DuplicatePanelAction(coreStart);
  await action.execute({ embeddable });
  expect(Object.keys(container.getInput().panels).length).toEqual(originalPanelCount + 1);
});

test('Duplicates an embeddable with a saved object ID', async () => {
  const dashboard = embeddable.getRoot() as IContainer;
  const originalPanelCount = Object.keys(dashboard.getInput().panels).length;
  const originalPanelKeySet = new Set(Object.keys(dashboard.getInput().panels));
  const panel = dashboard.getInput().panels[embeddable.id];
  panel.savedObjectId = 'holySavedObjectBatman';

  coreStart.savedObjects.client.get = jest
    .fn()
    .mockImplementation(() => ({ attributes: { title: 'Holy moly batman!' } }));

  coreStart.savedObjects.client.find = jest.fn().mockImplementation(() => ({ total: 150 }));

  coreStart.savedObjects.client.create = jest
    .fn()
    .mockImplementation(() => ({ id: 'brandNewSavedObject!' }));

  const action = new DuplicatePanelAction(coreStart);
  await action.execute({ embeddable });
  expect(coreStart.savedObjects.client.get).toHaveBeenCalledTimes(1);
  expect(coreStart.savedObjects.client.find).toHaveBeenCalledTimes(1);
  expect(coreStart.savedObjects.client.create).toHaveBeenCalledTimes(1);
  const newPanelId = Object.keys(container.getInput().panels).find(
    key => !originalPanelKeySet.has(key)
  );
  expect(newPanelId).toBeDefined();
  const newPanel = container.getInput().panels[newPanelId!];
  expect(newPanel.type).toEqual(CONTACT_CARD_EMBEDDABLE);
  expect(Object.keys(container.getInput().panels).length).toEqual(originalPanelCount + 1);
});
