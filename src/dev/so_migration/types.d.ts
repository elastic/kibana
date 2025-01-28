/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectTypeMigrationInfo } from '@kbn/core-test-helpers-so-type-serializer';

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
