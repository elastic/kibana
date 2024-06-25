/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceIdentifier, ServiceScope, ServiceLabel } from './service';
import type { ServiceFactory } from './service_factory';

/**
 * @internal
 */
export interface ServiceMetadata<T = unknown> {
  /**
   * The identifier of the service
   */
  id: ServiceIdentifier<T>;

  /**
   * The scope for this service
   */
  scope: ServiceScope;

  /**
   * The labels defined for this service
   */
  labels: ServiceLabel[];

  /**
   * The type of provider that was used to define this service
   * - factory: registered using a {@link ServiceFactoryRegistration}
   * - constructor: registered using a {@link ServiceConstructorRegistration}
   * - instance: TODO
   */
  providerType: 'factory' | 'constructor' | 'instance';

  /**
   * The factory that should be used to create this service.
   * Note that all registration types are converted into factory under the hood.
   */
  factory: ServiceFactory<T>;
}
