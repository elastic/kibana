/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { DocLinks } from '@kbn/doc-links';

/**
 * The set of static, precomputed values and services used by the ZDT migration
 */
export interface MigratorContext {
  /** The first part of the index name such as `.kibana` or `.kibana_task_manager` */
  readonly indexPrefix: string;
  /** The client to use for communications with ES */
  readonly elasticsearchClient: ElasticsearchClient;
  /** Preconfigured logger to use */
  readonly logger: Logger;
  /** The maximum number of retries to attempt for a failing action */
  readonly maxRetryAttempts: number;
  /** DocLinks for savedObjects. to reference online documentation */
  readonly migrationDocLinks: DocLinks['kibanaUpgradeSavedObjects'];
}
