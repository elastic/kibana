/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Container, injectable, inject } from 'inversify';
import type { ServiceIdentifier } from '@kbn/core-di-common';

export interface ServiceRegistry {
  provide: ProvideService;
  get: <T>(id: ServiceIdentifier<T>) => Promise<T>;
  injectable: typeof injectable;
  inject: typeof inject;
}

export type ProvideService = (cb: ProvideServiceModuleCallback) => Promise<void>;

/** @public */
export type ProvideServiceModuleCallback = (container: Pick<Container, 'bind'>) => Promise<void>;
