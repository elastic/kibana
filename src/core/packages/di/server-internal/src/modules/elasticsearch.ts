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
  ElasticsearchClient,
  InternalElasticsearchClient,
  Request,
  ScopedClusterClient,
  ScopedClusterClientFactory,
} from '@kbn/core-di-server';

export function loadElasticsearch({ bind }: ContainerModuleLoadOptions): void {
  bind(ScopedClusterClientFactory)
    .toResolvedValue(
      (elasticsearchStart, request) => (options) =>
        elasticsearchStart.client.asScoped(request, options),
      [CoreStart('elasticsearch'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(ScopedClusterClientFactory));

  bind(ScopedClusterClient)
    .toResolvedValue(
      (scopedClusterClientFactory) => scopedClusterClientFactory(),
      [ScopedClusterClientFactory]
    )
    .inRequestScope()
    .onActivation(cacheInScope(ScopedClusterClient));

  bind(ElasticsearchClient)
    .toResolvedValue(
      (scopedClusterClient) => scopedClusterClient.asCurrentUser,
      [ScopedClusterClient]
    )
    .inRequestScope()
    .onActivation(cacheInScope(ElasticsearchClient));

  bind(InternalElasticsearchClient)
    .toResolvedValue(
      (elasticsearchStart) => elasticsearchStart.client.asInternalUser,
      [CoreStart('elasticsearch')]
    )
    .inSingletonScope();
}
