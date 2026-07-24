/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Factory, ServiceIdentifier } from 'inversify';
import type {
  AsScopedOptions,
  ElasticsearchClient as IElasticsearchClient,
  IScopedClusterClient,
} from '@kbn/core-elasticsearch-server';

/**
 * Factory type for creating parameterized scoped cluster client instances.
 * @see {@link IScopedClusterClient}
 * @public
 */
export type IScopedClusterClientFactory = Factory<IScopedClusterClient, [AsScopedOptions?]>;

/**
 * The Elasticsearch client authenticated as the user of the current HTTP request.
 * @public
 */
export const ElasticsearchClient = Symbol(
  'ElasticsearchClient'
) as ServiceIdentifier<IElasticsearchClient>;

/**
 * The Elasticsearch client authenticated as the internal Kibana user.
 * @public
 */
export const InternalElasticsearchClient = Symbol(
  'InternalElasticsearchClient'
) as ServiceIdentifier<IElasticsearchClient>;

/**
 * The Elasticsearch cluster client scoped to the current HTTP request.
 * @see {@link IScopedClusterClient}
 * @public
 */
export const ScopedClusterClient = Symbol(
  'ScopedClusterClient'
) as ServiceIdentifier<IScopedClusterClient>;

/**
 * The cluster client factory that constructs a scoped client instance in the current HTTP request context.
 * @public
 */
export const ScopedClusterClientFactory = Symbol(
  'ScopedClusterClientFactory'
) as ServiceIdentifier<IScopedClusterClientFactory>;
