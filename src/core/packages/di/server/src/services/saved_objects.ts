/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Factory, ServiceIdentifier } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsClientProviderOptions,
} from '@kbn/core-saved-objects-server';

/**
 * Factory type for creating parameterized Saved Objects client instances.
 * @see {@link SavedObjectsClientContract}
 * @public
 */
export type ISavedObjectsClientFactory = Factory<
  SavedObjectsClientContract,
  [SavedObjectsClientProviderOptions?]
>;

/**
 * The Saved Objects client instance in the current HTTP request context.
 * @see {@link SavedObjectsClientContract}
 * @public
 */
export const SavedObjectsClient = Symbol(
  'SavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;

/**
 * The Saved Objects client factory that constructs a client instance the current HTTP request context.
 * @public
 */
export const SavedObjectsClientFactory = Symbol(
  'SavedObjectsClientFactory'
) as ServiceIdentifier<ISavedObjectsClientFactory>;

/**
 * The Saved Objects type registry.
 * @see {@link ISavedObjectTypeRegistry}
 * @public
 */
export const SavedObjectsTypeRegistry = Symbol(
  'SavedObjectsTypeRegistry'
) as ServiceIdentifier<ISavedObjectTypeRegistry>;
