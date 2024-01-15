/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceIdentifier, ServiceLabel } from './service';

/**
 * Defines an injection that should be performed by service id.
 */
export interface ByIdInjection<T = unknown> {
  /** static injection type identifier */
  type: 'serviceId';
  /** the identifier of the service to inject */
  serviceId: ServiceIdentifier<T>;
  /**
   * if true, the injector will not throw if the service is not resolved,
   * and will inject an `undefined` value instead.
   */
  optional: boolean;
}

/**
 * Defines an injection that should be performed by service label.
 */
export interface ByLabelInjection<T = unknown> {
  type: 'serviceLabel';
  serviceLabel: ServiceLabel<T>;
}

/**
 * Composite type defining all kind of injection means.
 */
export type InjectionParameter = ByIdInjection | ByLabelInjection;
