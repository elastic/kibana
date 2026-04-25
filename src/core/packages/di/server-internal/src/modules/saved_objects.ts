/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { cacheInScope } from '@kbn/core-di-internal';
import {
  CoreStart,
  Request,
  SavedObjectsClient,
  SavedObjectsClientFactory,
  SavedObjectsTypeRegistry,
} from '@kbn/core-di-server';

export function loadSavedObjects({ bind }: ContainerModuleLoadOptions): void {
  bind(SavedObjectsClient)
    .toResolvedValue(
      (savedObjectsClientFactory) => savedObjectsClientFactory(),
      [SavedObjectsClientFactory]
    )
    .inRequestScope()
    .onActivation(cacheInScope(SavedObjectsClient));

  bind(SavedObjectsClientFactory)
    .toResolvedValue(
      (savedObjectsStart, request) => (options) =>
        savedObjectsStart.getScopedClient(request, options),
      [CoreStart('savedObjects'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(SavedObjectsClientFactory));

  bind(SavedObjectsTypeRegistry)
    .toResolvedValue(
      (savedObjectsStart) => savedObjectsStart.getTypeRegistry(),
      [CoreStart('savedObjects')]
    )
    .inSingletonScope();
}
