/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from './types';

const registry: { [key: string]: () => Promise<ReactEmbeddableFactory<any, any, any>> } = {};

/**
 * Registers a new React embeddable factory. This should be called at plugin start time.
 *
 * @param type The key to register the factory under.
 * @param getFactory an async function that gets the factory definition for this key. This should always async import the
 * actual factory definition file to avoid polluting page load.
 */
export const registerReactEmbeddableFactory = <
  SerializedState extends object = object,
  RuntimeState extends object = SerializedState,
  Api extends DefaultEmbeddableApi<SerializedState, RuntimeState> = DefaultEmbeddableApi<
    SerializedState,
    RuntimeState
  >
>(
  type: string,
  getFactory: () => Promise<ReactEmbeddableFactory<SerializedState, RuntimeState, Api>>
) => {
  if (registry[type] !== undefined)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.factoryAlreadyExistsError', {
        defaultMessage: 'An embeddable factory for type: {key} is already registered.',
        values: { key: type },
      })
    );
  registry[type] = getFactory;
};

export const reactEmbeddableRegistryHasKey = (key: string) => registry[key] !== undefined;

export const getReactEmbeddableFactory = async <
  SerializedState extends object = object,
  RuntimeState extends object = SerializedState,
  Api extends DefaultEmbeddableApi<SerializedState, RuntimeState> = DefaultEmbeddableApi<
    SerializedState,
    RuntimeState
  >
>(
  key: string
): Promise<ReactEmbeddableFactory<SerializedState, RuntimeState, Api>> => {
  if (registry[key] === undefined)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.factoryNotFoundError', {
        defaultMessage: 'No embeddable factory found for type: {key}',
        values: { key },
      })
    );
  return registry[key]();
};
