/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type { NodeRoles } from '@kbn/core-node-server';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import type {
  VirtualVersionMap,
  SavedObjectsMigrationConfigType,
  IDocumentMigrator,
} from '@kbn/core-saved-objects-base-server-internal';
import type { DocLinks } from '@kbn/doc-links';

/**
 * The set of static, precomputed values and services used by the ZDT migration
 */
export interface MigratorContext {
  /** The migration configuration */
  readonly migrationConfig: SavedObjectsMigrationConfigType;
  /** The current Kibana version */
  readonly kibanaVersion: string;
  /** The first part of the index name such as `.kibana` or `.kibana_task_manager` */
  readonly indexPrefix: string;
  /** Name of the types that are living in the index */
  readonly types: string[];
  /** Virtual versions for the registered types */
  readonly typeVirtualVersions: VirtualVersionMap;
  /** The client to use for communications with ES */
  readonly elasticsearchClient: ElasticsearchClient;
  /** The maximum number of retries to attempt for a failing action */
  readonly maxRetryAttempts: number;
  /** DocLinks for savedObjects. to reference online documentation */
  readonly migrationDocLinks: DocLinks['kibanaUpgradeSavedObjects'];
  /** SO serializer to use for migration */
  readonly serializer: ISavedObjectsSerializer;
  /** The doc migrator to use */
  readonly documentMigrator: IDocumentMigrator;
  /** The SO type registry to use for the migration */
  readonly typeRegistry: ISavedObjectTypeRegistry;
  /** List of types that are no longer registered */
  readonly deletedTypes: string[];
  /** The number of documents to process at a time */
  readonly batchSize: number;
  /** If true, corrupted objects will be discarded instead of failing the migration */
  readonly discardCorruptObjects: boolean;
  /** The node roles of the Kibana instance */
  readonly nodeRoles: NodeRoles;
  /** Capabilities of the ES cluster we're using */
  readonly esCapabilities: ElasticsearchCapabilities;
}
