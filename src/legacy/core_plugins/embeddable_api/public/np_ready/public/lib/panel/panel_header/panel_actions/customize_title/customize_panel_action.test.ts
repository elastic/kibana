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

import { Container, isErrorEmbeddable } from '../../../..';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { nextTick } from 'test_utils/enzyme_helpers';
import { CustomizePanelTitleAction } from './customize_panel_action';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../../../../test_samples/embeddables/contact_card/contact_card_embeddable';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../../../test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { HelloWorldContainer } from '../../../../test_samples/embeddables/hello_world_container';
import { GetEmbeddableFactory } from '../../../../types';
import { EmbeddableFactory } from '../../../../embeddables';

let container: Container;
let embeddable: ContactCardEmbeddable;

function createHelloWorldContainer(input = { id: '123', panels: {} }) {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  const getEmbeddableFactory: GetEmbeddableFactory = (id: string) => embeddableFactories.get(id);
  embeddableFactories.set(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory({}, (() => {}) as any, {} as any)
  );
  return new HelloWorldContainer(input, { getEmbeddableFactory } as any);
}

beforeEach(async () => {
  container = createHelloWorldContainer();
  const contactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    id: 'robert',
    firstName: 'Robert',
    lastName: 'Baratheon',
  });
  if (isErrorEmbeddable(contactCardEmbeddable)) {
    throw new Error('Error creating new hello world embeddable');
  } else {
    embeddable = contactCardEmbeddable;
  }
});

test('Updates the embeddable title when given', async done => {
  const getUserData = () => Promise.resolve({ title: 'What is up?' });
  const customizePanelAction = new CustomizePanelTitleAction(getUserData);
  expect(embeddable.getInput().title).toBeUndefined();
  expect(embeddable.getTitle()).toBe('Hello Robert Baratheon');
  await customizePanelAction.execute({ embeddable });
  await nextTick();
  expect(embeddable.getTitle()).toBe('What is up?');
  expect(embeddable.getInput().title).toBe('What is up?');

  // Recreating the container should preserve the custom title.
  const containerClone = createHelloWorldContainer(container.getInput());
  // Need to wait for the container to tell us the embeddable has been loaded.
  const subscription = containerClone.getOutput$().subscribe(() => {
    if (containerClone.getOutput().embeddableLoaded[embeddable.id]) {
      expect(embeddable.getInput().title).toBe('What is up?');
      subscription.unsubscribe();
      done();
    }
  });
});

test('Empty string results in an empty title', async () => {
  const getUserData = () => Promise.resolve({ title: '' });
  const customizePanelAction = new CustomizePanelTitleAction(getUserData);
  expect(embeddable.getInput().title).toBeUndefined();
  expect(embeddable.getTitle()).toBe('Hello Robert Baratheon');

  await customizePanelAction.execute({ embeddable });
  await nextTick();
  expect(embeddable.getTitle()).toBe('');
});

test('Undefined title results in the original title', async () => {
  const getUserData = () => Promise.resolve({ title: 'hi' });
  const customizePanelAction = new CustomizePanelTitleAction(getUserData);
  expect(embeddable.getInput().title).toBeUndefined();
  expect(embeddable.getTitle()).toBe('Hello Robert Baratheon');
  await customizePanelAction.execute({ embeddable });
  await nextTick();
  expect(embeddable.getTitle()).toBe('hi');

  await new CustomizePanelTitleAction(() => Promise.resolve({ title: undefined })).execute({
    embeddable,
  });
  await nextTick();
  expect(embeddable.getTitle()).toBe('Hello Robert Baratheon');
});
