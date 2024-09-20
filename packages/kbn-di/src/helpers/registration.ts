/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ServiceRegistration,
  ServiceFactoryRegistration,
  ServiceConstructorRegistration,
  ServiceInstanceRegistration,
  ServiceFactory,
  ServiceConstructor,
} from '../types';

export function isFactoryRegistration<T>(
  registration: ServiceRegistration<T>
): registration is ServiceFactoryRegistration<T> {
  return 'factory' in registration;
}

export function isConstructorRegistration<T>(
  registration: ServiceRegistration<T>
): registration is ServiceConstructorRegistration<T> {
  return 'service' in registration;
}

export function isInstanceRegistration<T>(
  registration: ServiceRegistration<T>
): registration is ServiceInstanceRegistration<T> {
  return 'instance' in registration;
}

export const constructorToFactory = <T>(constructor: ServiceConstructor<T>): ServiceFactory<T> => {
  return {
    fn: (...args: any[]) => {
      return new constructor.type(...args);
    },
    params: constructor.params,
  };
};

export const instanceToFactory = <T>(instance: T): ServiceFactory<T> => {
  return {
    fn: () => instance,
    params: [],
  };
};
