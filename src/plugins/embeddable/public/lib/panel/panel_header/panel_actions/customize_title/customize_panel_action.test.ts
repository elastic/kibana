/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Container, isErrorEmbeddable } from '../../../..';
import { nextTick } from '@kbn/test/jest';
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
import { embeddablePluginMock } from '../../../../../mocks';

let container: Container;
let embeddable: ContactCardEmbeddable;

function createHelloWorldContainer(input = { id: '123', panels: {} }) {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory((() => {}) as any, {} as any)
  );
  const getEmbeddableFactory = doStart().getEmbeddableFactory;

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

test('Updates the embeddable title when given', async (done) => {
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
