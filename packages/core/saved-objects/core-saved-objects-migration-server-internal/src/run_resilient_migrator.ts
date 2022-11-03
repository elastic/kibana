/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/logging';
import { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  IndexMapping,
  SavedObjectsMigrationConfigType,
  MigrationResult,
} from '@kbn/core-saved-objects-base-server-internal';
import { TransformRawDocs } from './types';
import { next } from './next';
import { model } from './model';
import { createInitialState } from './initial_state';
import { migrationStateActionMachine } from './migrations_state_action_machine';

/**
 * To avoid the Elasticsearch-js client aborting our requests before we
 * receive a response from Elasticsearch we choose a requestTimeout that's
 * longer than the DEFAULT_TIMEOUT.
 *
 * This timeout is only really valuable for preventing migrations from being
 * stuck waiting forever for a response when the underlying socket is broken.
 *
 * We also set maxRetries to 0 so that the state action machine can handle all
 * retries. This way we get exponential back-off and logging for failed
 * actions.
 */
export const MIGRATION_CLIENT_OPTIONS = { maxRetries: 0, requestTimeout: 120_000 };

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
  docLinks,
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
  docLinks: DocLinksServiceStart;
}): Promise<MigrationResult> {
  const initialState = createInitialState({
    kibanaVersion,
    targetMappings,
    preMigrationScript,
    migrationVersionPerType,
    indexPrefix,
    migrationsConfig,
    typeRegistry,
    docLinks,
    logger,
  });
  const migrationClient = client.child(MIGRATION_CLIENT_OPTIONS);
  return migrationStateActionMachine({
    initialState,
    logger,
    next: next(migrationClient, transformRawDocs),
    model,
    client: migrationClient,
  });
}
