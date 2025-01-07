/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsExtensions,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import type { IKibanaMigrator, IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { RepositoryHelpers } from './helpers';
import type { RepositoryEsClient } from '../repository_es_client';

/**
 * Context passed from the SO repository to the API execution handlers.
 *
 * @internal
 */
export interface ApiExecutionContext {
  registry: ISavedObjectTypeRegistry;
  helpers: RepositoryHelpers;
  extensions: SavedObjectsExtensions;
  client: RepositoryEsClient;
  allowedTypes: string[];
  serializer: ISavedObjectsSerializer;
  migrator: IKibanaMigrator;
  logger: Logger;
  mappings: IndexMapping;
}
