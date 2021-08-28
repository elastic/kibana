/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from '@kbn/logging';
import type { SavedObjectsMigrationVersion } from '../../../types/saved_objects';
import type { ElasticsearchClient } from '../../elasticsearch/client/types';
import type { IndexMapping } from '../mappings/types';
import type { MigrationResult } from '../migrations/core/migration_coordinator';
import type { SavedObjectsMigrationConfigType } from '../saved_objects_config';
import type { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { createInitialState } from './initial_state';
import { migrationStateActionMachine } from './migrations_state_action_machine';
import { model } from './model/model';
import { next } from './next';
import type { TransformRawDocs } from './types';

/**
 * Migrates the provided indexPrefix index using a resilient algorithm that is
 * completely lock-free so that any failure can always be retried by
 * restarting Kibana.
 */
export async function runResilientMigrator({
  client,
  kibanaVersion,
  targetMappings,
  logger,
  preMigrationScript,
  transformRawDocs,
  migrationVersionPerType,
  indexPrefix,
  migrationsConfig,
  typeRegistry,
}: {
  client: ElasticsearchClient;
  kibanaVersion: string;
  targetMappings: IndexMapping;
  preMigrationScript?: string;
  logger: Logger;
  transformRawDocs: TransformRawDocs;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
  migrationsConfig: SavedObjectsMigrationConfigType;
  typeRegistry: ISavedObjectTypeRegistry;
}): Promise<MigrationResult> {
  const initialState = createInitialState({
    kibanaVersion,
    targetMappings,
    preMigrationScript,
    migrationVersionPerType,
    indexPrefix,
    migrationsConfig,
    typeRegistry,
  });
  return migrationStateActionMachine({
    initialState,
    logger,
    next: next(client, transformRawDocs),
    model,
    client,
  });
}
