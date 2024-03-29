/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from './types';

const registry: { [key: string]: ReactEmbeddableFactory<any, any> } = {};

export const registerReactEmbeddableFactory = <
  StateType extends object = object,
  APIType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
>(
  factory: ReactEmbeddableFactory<StateType, APIType>
) => {
  if (registry[factory.type] !== undefined)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.factoryAlreadyExistsError', {
        defaultMessage: 'An embeddable factory for for type: {key} is already registered.',
        values: { key: factory.type },
      })
    );
  registry[factory.type] = factory;
};

export const reactEmbeddableRegistryHasKey = (key: string) => registry[key] !== undefined;

export const getReactEmbeddableFactory = <
  StateType extends object = object,
  ApiType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
>(
  key: string
): ReactEmbeddableFactory<StateType, ApiType> => {
  if (registry[key] === undefined)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.factoryNotFoundError', {
        defaultMessage: 'No embeddable factory found for type: {key}',
        values: { key },
      })
    );
  return registry[key];
};
