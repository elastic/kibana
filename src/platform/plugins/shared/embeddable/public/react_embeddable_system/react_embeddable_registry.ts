/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DefaultEmbeddableApi, EmbeddableFactory } from './types';

const registry: { [key: string]: () => Promise<EmbeddableFactory<any, any>> } = {};

/**
 * Registers a new React embeddable factory. This should be called at plugin start time.
 *
 * @param type The key to register the factory under.
 * @param getFactory an async function that gets the factory definition for this key. This should always async import the
 * actual factory definition file to avoid polluting page load.
 */
export const registerReactEmbeddableFactory = <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
>(
  type: string,
  getFactory: () => Promise<EmbeddableFactory<SerializedState, Api>>
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

export const getReactEmbeddableFactory = async <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
>(
  key: string
): Promise<EmbeddableFactory<SerializedState, Api>> => {
  if (registry[key] === undefined)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.factoryNotFoundError', {
        defaultMessage: 'No embeddable factory found for type: {key}',
        values: { key },
      })
    );
  return registry[key]();
};
