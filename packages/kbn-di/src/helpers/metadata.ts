/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceRegistration, ServiceMetadata } from '../types';
import {
  constructorToFactory,
  instanceToFactory,
  isConstructorRegistration,
  isFactoryRegistration,
  isInstanceRegistration,
} from './registration';

export const convertRegistration = <T>(
  registration: ServiceRegistration<T>
): ServiceMetadata<T> => {
  const baseRegistration = {
    id: registration.id,
    scope: registration.scope,
    labels: registration.labels ?? [],
  };

  if (isFactoryRegistration(registration)) {
    return {
      ...baseRegistration,
      providerType: 'factory',
      factory: registration.factory,
    };
  } else if (isConstructorRegistration(registration)) {
    return {
      ...baseRegistration,
      providerType: 'constructor',
      factory: constructorToFactory(registration.service),
    };
  } else if (isInstanceRegistration(registration)) {
    return {
      ...baseRegistration,
      providerType: 'instance',
      factory: instanceToFactory(registration.instance),
    };
  } else {
    throw new Error('unsupported or unknown registration type');
  }
};
