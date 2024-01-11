/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceFactory } from './service_factory';
import type { ServiceConstructor } from './service_contructor';
import type { ServiceIdentifier, ServiceScope } from '../service';

export interface ServiceRegistrationBase<T> {
  id: ServiceIdentifier<T>;
  scope: ServiceScope; // TODO: | ContainerPredicate ff specified, the service will be instantiated at the closest level
  // TODO: implement. If specified, the service will be register at provided container / level
  // Defaults to `root`
  // Note that is specified, can't be
  // registerAt?: 'root' | 'container' | ContainerPredicate;
  // TODO: markers for injectMany
}

export interface ServiceFactoryRegistration<T> extends ServiceRegistrationBase<T> {
  factory: ServiceFactory<T>;
}

export interface ServiceConstructorRegistration<T> extends ServiceRegistrationBase<T> {
  service: ServiceConstructor<T>;
}

export type ServiceRegistration<T = unknown> =
  | ServiceFactoryRegistration<T>
  | ServiceConstructorRegistration<T>;
