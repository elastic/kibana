/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  type SavedObjectsMigrationConfigType,
  type MigrationResult,
} from '@kbn/core-saved-objects-base-server-internal';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import { migrationStateActionMachine } from './migration_state_action_machine';
import type { VersionedTransformer } from '../document_migrator';
import { createContext } from './context';
import { next } from './next';
import { model } from './model';
import { createInitialState } from './state';

export interface MigrateIndexOptions {
  indexPrefix: string;
  types: string[];
  /** The SO type registry to use for the migration */
  typeRegistry: ISavedObjectTypeRegistry;
  /** Logger to use for migration output */
  logger: Logger;
  /** The document migrator to use to convert the document */
  documentMigrator: VersionedTransformer;
  /** The migration config to use for the migration */
  migrationConfig: SavedObjectsMigrationConfigType;
  /** docLinks contract to use to link to documentation */
  docLinks: DocLinksServiceStart;
  /** SO serializer to use for migration */
  serializer: ISavedObjectsSerializer;
  /** The client to use for communications with ES */
  elasticsearchClient: ElasticsearchClient;
}

export const migrateIndex = async ({
  logger,
  ...options
}: MigrateIndexOptions): Promise<MigrationResult> => {
  const context = createContext(options);
  const initialState = createInitialState(context);

  return migrationStateActionMachine({
    initialState,
    next: next(context),
    model,
    context,
    logger,
  });
};
