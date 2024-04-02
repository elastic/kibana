/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  SavedObjectsMigrationConfigType,
  MigrationResult,
  IndexTypesMap,
} from '@kbn/core-saved-objects-base-server-internal';
import type { WaitGroup } from './kibana_migrator_utils';
import type { TransformRawDocs } from './types';
import { next } from './next';
import { model } from './model';
import { createInitialState } from './initial_state';
import { migrationStateActionMachine } from './migrations_state_action_machine';
import { cleanup } from './migrations_state_machine_cleanup';
import type { State } from './state';
import type { AliasAction } from './actions';

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

export interface RunResilientMigratorParams {
  client: ElasticsearchClient;
  kibanaVersion: string;
  waitForMigrationCompletion: boolean;
  mustRelocateDocuments: boolean;
  indexTypes: string[];
  indexTypesMap: IndexTypesMap;
  targetIndexMappings: IndexMapping;
  hashToVersionMap: Record<string, string>;
  preMigrationScript?: string;
  readyToReindex: WaitGroup<void>;
  doneReindexing: WaitGroup<void>;
  updateRelocationAliases: WaitGroup<AliasAction[]>;
  logger: Logger;
  transformRawDocs: TransformRawDocs;
  coreMigrationVersionPerType: SavedObjectsMigrationVersion;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
  migrationsConfig: SavedObjectsMigrationConfigType;
  typeRegistry: ISavedObjectTypeRegistry;
  docLinks: DocLinksServiceStart;
  esCapabilities: ElasticsearchCapabilities;
}

/**
 * Migrates the provided indexPrefix index using a resilient algorithm that is
 * completely lock-free so that any failure can always be retried by
 * restarting Kibana.
 */
export async function runResilientMigrator({
  client,
  kibanaVersion,
  waitForMigrationCompletion,
  mustRelocateDocuments,
  indexTypes,
  indexTypesMap,
  targetIndexMappings,
  hashToVersionMap,
  logger,
  preMigrationScript,
  readyToReindex,
  doneReindexing,
  updateRelocationAliases,
  transformRawDocs,
  coreMigrationVersionPerType,
  migrationVersionPerType,
  indexPrefix,
  migrationsConfig,
  typeRegistry,
  docLinks,
  esCapabilities,
}: RunResilientMigratorParams): Promise<MigrationResult> {
  const initialState = createInitialState({
    kibanaVersion,
    waitForMigrationCompletion,
    mustRelocateDocuments,
    indexTypes,
    indexTypesMap,
    hashToVersionMap,
    targetIndexMappings,
    preMigrationScript,
    coreMigrationVersionPerType,
    migrationVersionPerType,
    indexPrefix,
    migrationsConfig,
    typeRegistry,
    docLinks,
    logger,
    esCapabilities,
  });
  const migrationClient = client.child(MIGRATION_CLIENT_OPTIONS);
  return migrationStateActionMachine({
    initialState,
    logger,
    next: next(
      migrationClient,
      transformRawDocs,
      readyToReindex,
      doneReindexing,
      updateRelocationAliases
    ),
    model,
    abort: async (state?: State) => {
      // At this point, we could reject this migrator's defers and unblock other migrators
      // but we are going to throw and shutdown Kibana anyway, so there's no real point in it
      await cleanup(client, state);
    },
  });
}
