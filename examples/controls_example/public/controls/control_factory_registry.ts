/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ControlFactory } from './types';

const registry: { [key: string]: ControlFactory<any> } = {};

export const registerControlFactory = async <
  State extends object = object,
  Factory extends ControlFactory<State> = ControlFactory<State>
>(
  type: string,
  getFactory: () => Promise<Factory>
) => {
  if (registry[type] !== undefined)
    throw new Error(
      i18n.translate('controlFactoryRegistry.factoryAlreadyExistsError', {
        defaultMessage: 'A control factory for type: {key} is already registered.',
        values: { key: type },
      })
    );
  registry[type] = await getFactory();
};

export const getControlFactory = <
  State extends object = object,
  Factory extends ControlFactory<State> = ControlFactory<State>
>(
  key: string
): Factory => {
  console.log('registry', registry);
  if (registry[key] === undefined)
    throw new Error(
      i18n.translate('controlFactoryRegistry.factoryNotFoundError', {
        defaultMessage: 'No control factory found for type: {key}',
        values: { key },
      })
    );
  return registry[key];
};

export const getAllControlTypes = () => {
  return Object.keys(registry);
};
