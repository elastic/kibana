/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  DefaultEmbeddableApi,
  ReactEmbeddable,
  ReactEmbeddableFactory,
  ReactEmbeddableRegistration,
} from './types';

const registry: { [key: string]: ReactEmbeddableFactory<any, any> } = {};

export const registerReactEmbeddableFactory = <
  StateType extends unknown = unknown,
  APIType extends DefaultEmbeddableApi = DefaultEmbeddableApi
>(
  key: string,
  factory: ReactEmbeddableFactory<StateType, APIType>
) => {
  if (registry[key] !== undefined)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.factoryAlreadyExistsError', {
        defaultMessage: 'An embeddable factory for for type: {key} is already registered.',
        values: { key },
      })
    );
  registry[key] = factory;
};

export const reactEmbeddableRegistryHasKey = (key: string) => registry[key] !== undefined;

export const getReactEmbeddableFactory = <
  StateType extends unknown = unknown,
  ApiType extends DefaultEmbeddableApi = DefaultEmbeddableApi
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

/**
 * A helper function which transforms a component into an Embeddable component by forwarding a ref which
 * should be used with `useEmbeddableApiHandle` to expose an API for your component.
 */
export const RegisterReactEmbeddable: <ApiType extends DefaultEmbeddableApi = DefaultEmbeddableApi>(
  component: ReactEmbeddableRegistration<ApiType>
) => ReactEmbeddable<ApiType> = (component) => React.forwardRef((_, apiRef) => component(apiRef));
