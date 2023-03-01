/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import type { ModelVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import type { DocLinks } from '@kbn/doc-links';

/**
 * The set of static, precomputed values and services used by the ZDT migration
 */
export interface MigratorContext {
  /** The current Kibana version */
  readonly kibanaVersion: string;
  /** The first part of the index name such as `.kibana` or `.kibana_task_manager` */
  readonly indexPrefix: string;
  /** Name of the types that are living in the index */
  readonly types: string[];
  /** Model versions for the registered types */
  readonly typeModelVersions: ModelVersionMap;
  /** The client to use for communications with ES */
  readonly elasticsearchClient: ElasticsearchClient;
  /** The maximum number of retries to attempt for a failing action */
  readonly maxRetryAttempts: number;
  /** DocLinks for savedObjects. to reference online documentation */
  readonly migrationDocLinks: DocLinks['kibanaUpgradeSavedObjects'];
  /** SO serializer to use for migration */
  readonly serializer: ISavedObjectsSerializer;
  /** The SO type registry to use for the migration */
  readonly typeRegistry: ISavedObjectTypeRegistry;
  /** List of types that are no longer registered */
  readonly deletedTypes: string[];
}
