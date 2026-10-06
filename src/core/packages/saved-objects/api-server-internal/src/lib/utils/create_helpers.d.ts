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
  IKibanaMigrator,
  SavedObjectsSerializer,
} from '@kbn/core-saved-objects-base-server-internal';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsExtensions,
} from '@kbn/core-saved-objects-server';
import type { RepositoryHelpers } from '../apis/helpers';
import type { RepositoryEsClient } from '../repository_es_client';
import type { CreatePointInTimeFinderFn } from '../point_in_time_finder';
interface CreateRepositoryHelpersOptions {
  index: string;
  client: RepositoryEsClient;
  typeRegistry: ISavedObjectTypeRegistry;
  serializer: SavedObjectsSerializer;
  migrator: IKibanaMigrator;
  logger: Logger;
  extensions?: SavedObjectsExtensions;
  createPointInTimeFinder: CreatePointInTimeFinderFn;
}
export declare const createRepositoryHelpers: ({
  logger,
  extensions,
  index,
  client,
  typeRegistry,
  serializer,
  migrator,
  createPointInTimeFinder,
}: CreateRepositoryHelpersOptions) => RepositoryHelpers;
export {};
