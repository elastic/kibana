/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'reflect-metadata';
import { Container, injectable, inject } from 'inversify';
import type { ServiceIdentifier } from '@kbn/core-di-common';
import { ServiceRegistry } from './contracts';

/** Placeholder to just have some root container, this should be a singleton */
const rootContainer = new Container();
const servicesContainer = rootContainer.createChild(); // Not sure this is needed

/** @public global di system */
export const di: ServiceRegistry = {
  // Needs more thought, but basically a dynamic, asynchronous service loader
  provide: async (callback) => {
    await callback(servicesContainer);
  },
  // Needs to wait for Core and other services to be ready
  get: async (id) => servicesContainer.getAsync(id),
  injectable,
  inject,
};

export type { ProvideService } from './contracts';

/** Imagine this was done in appropriate packages / organised better */
export const serviceIdentifiers = {
  formula: 'formula',
  lensConfigBuilder: 'LensConfigBuilder' as ServiceIdentifier<any>,
  /** Placeholder for all plugin contracts */
  legacy: {
    dataViews: {
      start: 'legacy.dataViews.start',
    },
  },
};
