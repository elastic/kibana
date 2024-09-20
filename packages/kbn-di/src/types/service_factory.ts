/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InjectionParameter } from './injection_parameters';

export type FactoryFunction<T> = (...args: any[]) => T;

/**
 * Definition of a factory that can be used to build a service.
 */
export interface ServiceFactory<T> {
  /**
   * The factory function to call.
   */
  fn: FactoryFunction<T>;
  /**
   * The parameters to be injected into the factory function.
   */
  params: InjectionParameter[];
}
