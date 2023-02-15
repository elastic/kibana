/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
import { stateActionMachine } from '../state_action_machine';
import type { VersionedTransformer } from '../document_migrator';

export interface MigrateIndexOptions {
  indexPrefix: string;
  types: string[];
  /** The kibana system index prefix. e.g `.kibana` */
  kibanaIndexPrefix: string;
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
  /** */
  serializer: ISavedObjectsSerializer;
}

export const migrateIndex = async ({}: MigrateIndexOptions): Promise<MigrationResult> => {
  return { status: 'skipped' };
};
