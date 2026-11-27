/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { DocLinks } from '@kbn/doc-links';
import type {
  ElasticsearchCapabilities,
  ElasticsearchClient,
} from '@kbn/core-elasticsearch-server';
import type { NodeRoles } from '@kbn/core-node-server';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
  SavedObjectsType,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
} from '@kbn/core-saved-objects-server';
import {
  getLatestMappingsVirtualVersionMap,
  getVirtualVersionMap,
  type IDocumentMigrator,
  type IndexMapping,
  type SavedObjectsMigrationConfigType,
  type VirtualVersionMap,
} from '@kbn/core-saved-objects-base-server-internal';
import type { TransformRawDocs } from '../types';
import { buildExcludeUnusedTypesQuery } from '../core';
import { createDocumentTransformFn, getOutdatedDocumentsQuery } from '../zdt/utils';
import { buildIndexMappings } from './index_meta';

/**
 * Behaviours that differ between deployment profiles (classic vs Serverless).
 * They are derived from the environment by {@link deriveMigrationInputs}, not configured.
 */
export interface MigrationInputs {
  /** Accept indices written by a newer Kibana version (rollbacks), instead of failing. */
  readonly allowDowngrade: boolean;
  /** Remove the version aliases of previous Kibana versions, which fences off stale instances. */
  readonly removeOutdatedVersionAliases: boolean;
  /** Check `cluster.routing.allocation.enable` before writing. */
  readonly checkClusterRoutingAllocation: boolean;
  /** Call `_cluster/allocation/explain` when shards are unavailable during bulk writes. */
  readonly fetchAllocationExplain: boolean;
  /** Wait for another node to complete the migration rather than performing it. */
  readonly waitForMigrationCompletion: boolean;
  /** Convert outdated documents on this node. */
  readonly migrateDocuments: boolean;
  /**
   * Pick up the updated mappings in the existing documents, and record them in `_meta.mappingVersions`.
   * Otherwise, the mappings are only added, and a later migration picks them up.
   */
  readonly pickupUpdatedMappings: boolean;
}

export interface DeriveMigrationInputsParams {
  esCapabilities: ElasticsearchCapabilities;
  nodeRoles: NodeRoles;
  /** Whether this node waits for another one to perform the migration (classic background-tasks-only nodes). */
  waitForMigrationCompletion: boolean;
  /** The roles that convert documents on Serverless (`migrations.zdt.runOnRoles`). */
  runOnRoles: string[];
}

/** Derives the profile-specific {@link MigrationInputs} from the environment. */
export const deriveMigrationInputs = ({
  esCapabilities: { serverless },
  nodeRoles,
  waitForMigrationCompletion,
  runOnRoles,
}: DeriveMigrationInputsParams): MigrationInputs => {
  const waits = waitForMigrationCompletion && !serverless;
  const roles = Object.entries(nodeRoles)
    .filter(([, enabled]) => enabled)
    .map(([role]) => role);
  return {
    allowDowngrade: serverless,
    removeOutdatedVersionAliases: !serverless,
    checkClusterRoutingAllocation: !serverless,
    fetchAllocationExplain: !serverless,
    waitForMigrationCompletion: waits,
    migrateDocuments: serverless ? roles.some((role) => runOnRoles.includes(role)) : !waits,
    pickupUpdatedMappings: true,
  };
};

/** Immutable configuration of the migration of one index. */
export interface MigrationContext extends MigrationInputs {
  readonly indexPrefix: string;
  readonly kibanaVersion: string;
  /** Fail if the index was last written by a Kibana version older than this one. */
  readonly minimumPreviousVersion: string | undefined;
  /** The names of the types stored in this index. */
  readonly types: string[];
  readonly typeDefinitions: SavedObjectsType[];
  /** The model version of each type, as stored in `mappingVersions` and `docVersions`. */
  readonly typeVirtualVersions: VirtualVersionMap;
  /** The latest model version of each type that changed its mappings. */
  readonly latestMappingsVersions: VirtualVersionMap;
  /** Types that have been removed from Kibana. */
  readonly deletedTypes: string[];
  /** The mappings (including `_meta`) used to create the index. */
  readonly indexMappings: IndexMapping;
  readonly outdatedDocumentsQuery: QueryDslQueryContainer;
  readonly excludeOnUpgradeQuery: QueryDslQueryContainer;
  readonly excludeFromUpgradeFilterHooks: Record<
    string,
    SavedObjectTypeExcludeFromUpgradeFilterHook
  >;
  readonly transformRawDocs: TransformRawDocs;
  readonly batchSize: number;
  readonly maxBatchSizeBytes: number;
  readonly maxReadBatchSizeBytes: number;
  readonly maxRetryAttempts: number;
  readonly discardUnknownObjects: boolean;
  readonly discardCorruptObjects: boolean;
  readonly migrationDocLinks: DocLinks['kibanaUpgradeSavedObjects'];
  readonly elasticsearchClient: ElasticsearchClient;
  readonly esCapabilities: ElasticsearchCapabilities;
}

export interface CreateContextParams {
  inputs: MigrationInputs;
  indexPrefix: string;
  /** The names of the types stored in this index. */
  types: string[];
  kibanaVersion: string;
  minimumPreviousVersion?: string;
  typeRegistry: ISavedObjectTypeRegistry;
  documentMigrator: IDocumentMigrator;
  serializer: ISavedObjectsSerializer;
  migrationConfig: SavedObjectsMigrationConfigType;
  docLinks: DocLinksServiceStart;
  elasticsearchClient: ElasticsearchClient;
  esCapabilities: ElasticsearchCapabilities;
}

export const createContext = ({
  inputs,
  indexPrefix,
  types,
  kibanaVersion,
  minimumPreviousVersion,
  typeRegistry,
  documentMigrator,
  serializer,
  migrationConfig,
  docLinks,
  elasticsearchClient,
  esCapabilities,
}: CreateContextParams): MigrationContext => {
  const typeDefinitions = types
    .map((name) => typeRegistry.getType(name))
    .filter((type): type is SavedObjectsType => type !== undefined);
  const typeVirtualVersions = getVirtualVersionMap({
    types: typeDefinitions,
    useModelVersionsOnly: true,
  });

  return {
    ...inputs,
    indexPrefix,
    kibanaVersion,
    minimumPreviousVersion,
    types: typeDefinitions.map(({ name }) => name),
    typeDefinitions,
    typeVirtualVersions,
    latestMappingsVersions: getLatestMappingsVirtualVersionMap(typeDefinitions),
    deletedTypes: typeRegistry.getLegacyTypes(),
    indexMappings: buildIndexMappings({ types: typeDefinitions, typeVirtualVersions }),
    outdatedDocumentsQuery: getOutdatedDocumentsQuery({ types: typeDefinitions }),
    excludeOnUpgradeQuery: buildExcludeUnusedTypesQuery(typeRegistry.getLegacyTypes()),
    excludeFromUpgradeFilterHooks: Object.fromEntries(
      typeDefinitions.flatMap(({ name, excludeOnUpgrade }) =>
        excludeOnUpgrade ? [[name, excludeOnUpgrade]] : []
      )
    ),
    transformRawDocs: createDocumentTransformFn({ documentMigrator, serializer }),
    batchSize: migrationConfig.batchSize,
    maxBatchSizeBytes: migrationConfig.maxBatchSizeBytes.getValueInBytes(),
    maxReadBatchSizeBytes: migrationConfig.maxReadBatchSizeBytes.getValueInBytes(),
    maxRetryAttempts: migrationConfig.retryAttempts,
    discardUnknownObjects: migrationConfig.discardUnknownObjects === kibanaVersion,
    discardCorruptObjects: migrationConfig.discardCorruptObjects === kibanaVersion,
    migrationDocLinks: docLinks.links.kibanaUpgradeSavedObjects,
    elasticsearchClient,
    esCapabilities,
  };
};
