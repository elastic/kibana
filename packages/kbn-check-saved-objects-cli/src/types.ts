/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { Root } from '@kbn/core-root-server-internal';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import type { SavedObjectTypeMigrationInfo } from '@kbn/core-test-helpers-so-type-serializer';

export interface ServerHandles {
  esServer: TestElasticsearchUtils;
  kibanaRoot: Root;
  coreStart: InternalCoreStart;
}

export type MigrationInfoRecord = Pick<
  SavedObjectTypeMigrationInfo,
  'name' | 'migrationVersions' | 'schemaVersions' | 'modelVersions' | 'mappings'
> & {
  hash: string;
};

export interface MigrationSnapshotMeta {
  date: string;
  kibanaCommitHash: string;
  buildUrl: string | null;
  pullRequestUrl: string | null;
  timestamp: number;
}

export interface MigrationSnapshot {
  meta: MigrationSnapshotMeta;
  typeDefinitions: Record<string, MigrationInfoRecord>;
}
