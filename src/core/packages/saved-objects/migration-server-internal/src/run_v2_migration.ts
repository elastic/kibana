/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
  SavedObjectsRawDoc,
} from '@kbn/core-saved-objects-server';
import {
  getVirtualVersionMap,
  type IndexMappingMeta,
  type IndexTypesMap,
  type MigrationResult,
  type SavedObjectsMigrationConfigType,
  type SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';
import Semver from 'semver';
import { pick } from 'lodash';
import type { DocumentMigrator } from './document_migrator';
import { buildActiveMappings, createIndexMap } from './core';
import {
  createWaitGroupMap,
  getIndicesInvolvedInRelocation,
  indexMapToIndexTypesMap,
} from './kibana_migrator_utils';
import { runResilientMigrator } from './run_resilient_migrator';
import { migrateRawDocsSafely } from './core/migrate_raw_docs';

export interface RunV2MigrationOpts {
  /** The current Kibana version */
  kibanaVersion: string;
  /** The default Kibana SavedObjects index prefix. e.g `.kibana` */
  kibanaIndexPrefix: string;
  /** The SO type registry to use for the migration */
  typeRegistry: ISavedObjectTypeRegistry;
  /** The map of indices => types to use as a default / baseline state */
  defaultIndexTypesMap: IndexTypesMap;
  /** A map that holds [last md5 used => modelVersion] for each of the SO types */
  hashToVersionMap: Record<string, string>;
  /** Logger to use for migration output */
  logger: Logger;
  /** The document migrator to use to convert the document */
  documentMigrator: DocumentMigrator;
  /** docLinks contract to use to link to documentation */
  docLinks: DocLinksServiceStart;
  /** SO serializer to use for migration */
  serializer: ISavedObjectsSerializer;
  /** The client to use for communications with ES */
  elasticsearchClient: ElasticsearchClient;
  /** The configuration that drives the behavior of each migrator */
  migrationConfig: SavedObjectsMigrationConfigType;
  /** The definitions of the different saved object types */
  mappingProperties: SavedObjectsTypeMappingDefinitions;
  /** Tells whether this instance should actively participate in the migration or not */
  waitForMigrationCompletion: boolean;
  /** Capabilities of the ES cluster we're using */
  esCapabilities: ElasticsearchCapabilities;
}

export const runV2Migration = async (options: RunV2MigrationOpts): Promise<MigrationResult[]> => {
  const indexMap = createIndexMap({
    kibanaIndexName: options.kibanaIndexPrefix,
    indexMap: options.mappingProperties,
    registry: options.typeRegistry,
  });

  options.logger.debug('Applying registered migrations for the following saved object types:');
  Object.entries(options.documentMigrator.getMigrationVersion())
    .sort(([t1, v1], [t2, v2]) => {
      return Semver.compare(v1, v2);
    })
    .forEach(([type, migrationVersion]) => {
      options.logger.debug(`migrationVersion: ${migrationVersion} saved object type: ${type}`);
    });

  // build a indexTypesMap from the info present in the typeRegistry, e.g.:
  // {
  //   '.kibana': ['typeA', 'typeB', ...]
  //   '.kibana_task_manager': ['task', ...]
  //   '.kibana_cases': ['typeC', 'typeD', ...]
  //   ...
  // }
  const indexTypesMap = indexMapToIndexTypesMap(indexMap);

  // compare indexTypesMap with the one present (or not) in the .kibana index meta
  // and check if some SO types have been moved to different indices
  const indicesWithRelocatingTypes = await getIndicesInvolvedInRelocation({
    mainIndex: options.kibanaIndexPrefix,
    client: options.elasticsearchClient,
    indexTypesMap,
    logger: options.logger,
    defaultIndexTypesMap: options.defaultIndexTypesMap,
  });

  // we create synchronization objects (synchronization points) for each of the
  // migrators involved in relocations, aka each of the migrators that will:
  // A) reindex some documents TO other indices
  // B) receive some documents FROM other indices
  // C) both
  const readyToReindexWaitGroupMap = createWaitGroupMap(indicesWithRelocatingTypes);
  const doneReindexingWaitGroupMap = createWaitGroupMap(indicesWithRelocatingTypes);
  const updateAliasesWaitGroupMap = createWaitGroupMap(indicesWithRelocatingTypes);

  // build a list of all migrators that must be started
  const migratorIndices = new Set(Object.keys(indexMap));
  // the types in indices involved in relocation might not have mappings in the current mappings anymore
  // but if their SOs must be relocated to another index, we still need a migrator to do the job
  indicesWithRelocatingTypes.forEach((index) => migratorIndices.add(index));

  // we will store model versions instead of hashes (to be FIPS compliant)
  const appVersions = getVirtualVersionMap(options.typeRegistry.getAllTypes());

  const migrators = Array.from(migratorIndices).map((indexName, i) => {
    return {
      migrate: (): Promise<MigrationResult> => {
        const readyToReindex = readyToReindexWaitGroupMap[indexName];
        const doneReindexing = doneReindexingWaitGroupMap[indexName];
        const updateRelocationAliases = updateAliasesWaitGroupMap[indexName];
        // check if this migrator's index is involved in some document redistribution
        const mustRelocateDocuments = indicesWithRelocatingTypes.includes(indexName);

        // a migrator's index might no longer have any associated types to it
        const typeDefinitions = indexMap[indexName]?.typeMappings ?? {};

        const indexTypes = Object.keys(typeDefinitions);
        // store only the model versions of SO types that belong to the index
        const mappingVersions = pick(appVersions, indexTypes);

        const _meta: IndexMappingMeta = {
          indexTypesMap,
          mappingVersions,
        };

        return runResilientMigrator({
          client: options.elasticsearchClient,
          kibanaVersion: options.kibanaVersion,
          mustRelocateDocuments,
          indexTypes,
          indexTypesMap,
          hashToVersionMap: options.hashToVersionMap,
          waitForMigrationCompletion: options.waitForMigrationCompletion,
          targetIndexMappings: buildActiveMappings(typeDefinitions, _meta),
          logger: options.logger,
          preMigrationScript: indexMap[indexName]?.script,
          readyToReindex,
          doneReindexing,
          updateRelocationAliases,
          transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) =>
            migrateRawDocsSafely({
              serializer: options.serializer,
              migrateDoc: options.documentMigrator.migrateAndConvert,
              rawDocs,
            }),
          coreMigrationVersionPerType: options.documentMigrator.getMigrationVersion({
            includeDeferred: false,
            migrationType: 'core',
          }),
          migrationVersionPerType: options.documentMigrator.getMigrationVersion({
            includeDeferred: false,
          }),
          indexPrefix: indexName,
          migrationsConfig: options.migrationConfig,
          typeRegistry: options.typeRegistry,
          docLinks: options.docLinks,
          esCapabilities: options.esCapabilities,
        });
      },
    };
  });

  return Promise.all(migrators.map((migrator) => migrator.migrate()));
};
