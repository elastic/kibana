/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  SavedObjectsMigrationConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import { type OutdatedDocumentsQueryParams } from './get_outdated_documents_query';
import type { InitState } from './state';
export interface CreateInitialStateParams extends OutdatedDocumentsQueryParams {
  kibanaVersion: string;
  waitForMigrationCompletion: boolean;
  indexTypes: string[];
  hashToVersionMap: Record<string, string>;
  targetIndexMappings: IndexMapping;
  indexPrefix: string;
  migrationsConfig: SavedObjectsMigrationConfigType;
  typeRegistry: ISavedObjectTypeRegistry;
  docLinks: DocLinksServiceStart;
  logger: Logger;
  esCapabilities: ElasticsearchCapabilities;
}
/**
 * Construct the initial state for the model
 */
export declare const createInitialState: ({
  kibanaVersion,
  waitForMigrationCompletion,
  indexTypes,
  hashToVersionMap,
  targetIndexMappings,
  coreMigrationVersionPerType,
  migrationVersionPerType,
  indexPrefix,
  migrationsConfig,
  typeRegistry,
  docLinks,
  logger,
  esCapabilities,
}: CreateInitialStateParams) => InitState;
