/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ContainerInput, EmbeddableContainerSettings, isErrorEmbeddable } from '../lib';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
  FilterableEmbeddableFactory,
  HelloWorldContainer,
  SlowContactCardEmbeddableFactory,
} from '../lib/test_samples';
import { HelloWorldEmbeddableFactoryDefinition } from './fixtures';
import { testPlugin } from './test_plugin';

export async function createHelloWorldContainerAndEmbeddable(
  containerInput: ContainerInput = { id: 'hello', panels: {} },
  embeddableInput = {},
  settings?: EmbeddableContainerSettings
) {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const { setup, doStart, uiActions } = testPlugin(coreSetup, coreStart);
  const filterableFactory = new FilterableEmbeddableFactory();
  const slowContactCardFactory = new SlowContactCardEmbeddableFactory({
    execAction: uiActions.executeTriggerActions,
  });
  const contactCardCreateSpy = jest.spyOn(slowContactCardFactory, 'create');

  const helloWorldFactory = new HelloWorldEmbeddableFactoryDefinition();

  setup.registerEmbeddableFactory(filterableFactory.type, filterableFactory);
  setup.registerEmbeddableFactory(slowContactCardFactory.type, slowContactCardFactory);
  setup.registerEmbeddableFactory(helloWorldFactory.type, helloWorldFactory);

  const start = doStart();

  const container = new HelloWorldContainer(
    containerInput,
    {
      getEmbeddableFactory: start.getEmbeddableFactory,
    },
    settings
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, embeddableInput);

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error adding embeddable');
  }

  return {
    setup,
    start,
    coreSetup,
    coreStart,
    container,
    uiActions,
    embeddable,
    contactCardCreateSpy,
  };
}

export const expectErrorAsync = (fn: (...args: unknown[]) => Promise<unknown>): Promise<Error> => {
  return fn()
    .then(() => {
      throw new Error('Expected an error throw.');
    })
    .catch((error) => {
      if (error.message === 'Expected an error throw.') {
        throw error;
      }
      return error;
    });
};

export const expectError = (fn: (...args: unknown[]) => unknown): Error => {
  try {
    fn();
    throw new Error('Expected an error throw.');
  } catch (error) {
    if (error.message === 'Expected an error throw.') {
      throw error;
    }
    return error;
  }
};

export const of = async <T, P extends Promise<T>>(
  promise: P
): Promise<[T | undefined, Error | unknown]> => {
  try {
    return [await promise, undefined];
  } catch (error) {
    return [, error];
  }
};
