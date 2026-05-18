/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { DefaultEmbeddableApi, EmbeddableFactory } from './types';

const registry: { [key: string]: () => Promise<EmbeddableFactory<any, any>> } = {};

export const TYPE_REGEX = /^[a-z_]+$/; // lowercase letters and underscores

let isSetupComplete = false;

/**
 * Registers an embeddable public defintion. This should be called at plugin setup time.
 * Be sure to register an embeddable server definition for this type.
 *
 * @param type The key to register the embeddable public defintion. Part of public "dashboards as code" REST API.
 * Must be lower case, snake cased, and concise.
 * @param getFactory an async function that gets the factory definition for this key. This should always async import the
 * actual factory definition file to avoid polluting page load.
 */
export const registerEmbeddablePublicDefinition = <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
>(
  type: string,
  getFactory: () => Promise<EmbeddableFactory<SerializedState, Api>>
) => {
  if (isSetupComplete)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.setCompleteError', {
        defaultMessage:
          'Embeddables must be registered during plugin setup phase. Do not register embeddables asynchronously',
      })
    );
  if (registry[type] !== undefined)
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.factoryAlreadyExistsError', {
        defaultMessage: 'An embeddable factory for type: {key} is already registered.',
        values: { key: type },
      })
    );

  if (!TYPE_REGEX.test(type))
    throw new Error(
      i18n.translate('embeddableApi.reactEmbeddable.invalidTypeError', {
        defaultMessage: 'Type must be lower case and snake cased.',
      })
    );

  registry[type] = getFactory;
};

export const getReactEmbeddableFactory = async <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
>(
  key: string
): Promise<EmbeddableFactory<SerializedState, Api> | undefined> => {
  return registry[key]?.();
};

export function closeSetup() {
  isSetupComplete = true;
}
