/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as Option from 'fp-ts/Option';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DocLinks } from '@kbn/doc-links';
import type { SavedObjectTypeExcludeFromUpgradeFilterHook } from '@kbn/core-saved-objects-server';
import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { AliasAction } from '../actions';
import type { MigrationLog } from '../types';
import type { Aliases } from '../model/helpers';

/** Retry + trace fields present on every control point. */
export interface BaseState {
  readonly retryCount: number;
  readonly skipRetryReset: boolean;
  readonly retryDelay: number;
  readonly retryAttempts: number;
  readonly logs: MigrationLog[];
}

/**
 * V2 BaseState fields shared across nearly all non-terminal states (from INIT onward).
 */
export interface MigrationBaseState extends BaseState {
  readonly indexPrefix: string;
  readonly kibanaVersion: string;
  readonly targetIndexMappings: IndexMapping;
  readonly outdatedDocumentsQuery: QueryDslQueryContainer;
  readonly maxBatchSize: number;
  readonly batchSize: number;
  readonly maxBatchSizeBytes: number;
  readonly maxReadBatchSizeBytes: number;
  readonly discardUnknownObjects: boolean;
  readonly discardCorruptObjects: boolean;
  readonly currentAlias: string;
  readonly versionAlias: string;
  readonly versionIndex: string;
  readonly excludeOnUpgradeQuery: QueryDslQueryContainer;
  readonly knownTypes: string[];
  readonly indexTypes: string[];
  readonly latestMappingsVersions: VirtualVersionMap;
  readonly hashToVersionMap: Record<string, string>;
  readonly excludeFromUpgradeFilterHooks: Record<
    string,
    SavedObjectTypeExcludeFromUpgradeFilterHook
  >;
  readonly migrationDocLinks: DocLinks['kibanaUpgradeSavedObjects'];
  readonly waitForMigrationCompletion: boolean;
  readonly esCapabilities: ElasticsearchCapabilities;
}

/** Fields added after INIT resolves (PostInitState in V2). */
export interface PostInitFields {
  readonly aliases: Aliases;
  readonly sourceIndex: Option.Option<string>;
  readonly sourceIndexMappings: Option.Option<IndexMapping>;
  readonly targetIndex: string;
  readonly versionIndexReadyActions: Option.Option<AliasAction[]>;
}

export interface PostInitState extends MigrationBaseState, PostInitFields {}

export interface SourceExistsState extends PostInitState {
  readonly sourceIndex: Option.Some<string>;
  readonly sourceIndexMappings: Option.Some<IndexMapping>;
}
