/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ControlFactory } from './types';

const registry: { [key: string]: () => Promise<ControlFactory<any>> } = {};

export const registerControlFactory = <State extends object = object>(
  type: string,
  getFactory: () => Promise<ControlFactory<State>>
) => {
  if (registry[type] !== undefined)
    throw new Error(
      i18n.translate('controlFactoryRegistry.factoryAlreadyExistsError', {
        defaultMessage: 'A control factory for type: {key} is already registered.',
        values: { key: type },
      })
    );
  registry[type] = getFactory;
};

export const getControlFactory = <State extends object = object>(
  key: string
): Promise<ControlFactory<State>> => {
  if (registry[key] === undefined)
    throw new Error(
      i18n.translate('controlFactoryRegistry.factoryNotFoundError', {
        defaultMessage: 'No control factory found for type: {key}',
        values: { key },
      })
    );
  return registry[key]();
};
