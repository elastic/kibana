/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InjectionParameter } from './injection_parameters';

export type Constructable<T> = new (...args: any[]) => T;

/**
 * Definition of a constructor that can be used to build a service.
 */
export interface ServiceConstructor<T> {
  /**
   * The constructor to be used to instantiate the service.
   */
  type: Constructable<T>;
  /**
   * The parameters to be injected into the type's constructor.
   */
  params: InjectionParameter[];
}
