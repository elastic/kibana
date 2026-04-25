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
import Semver, { SemVer } from 'semver';
import { pick } from 'lodash';
import type { Histogram } from '@opentelemetry/api';
import type { DocumentMigrator } from './document_migrator';
import { buildActiveMappings, createIndexMap } from './core';
import {
  createWaitGroupMap,
  getIndicesInvolvedInRelocation,
  indexMapToIndexTypesMap,
} from './kibana_migrator_utils';
import { runResilientMigrator } from './run_resilient_migrator';
import { migrateRawDocsSafely } from './core/migrate_raw_docs';
import type { IndexDetails } from './core/get_index_details';
import { extractVersionFromKibanaIndexAliases, getIndexDetails } from './core/get_index_details';

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
  /** If we are upgrading from an older Kibana, ensure that the previous version is at least the specified value (e.g. kibanaVersionCheck: '8.18.0') */
  kibanaVersionCheck: string | undefined;
  /** The OTel Histogram metric to record the duration of each migrator */
  meter: Histogram;
}

export const runV2Migration = async (options: RunV2MigrationOpts): Promise<MigrationResult[]> => {
  const mainIndex = options.kibanaIndexPrefix;
  let indexDetails: IndexDetails | undefined;

  try {
    // try to find out if `.kibana index already exists, and get some information from it
    indexDetails = await getIndexDetails(options.elasticsearchClient, mainIndex);
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      options.logger.debug(
        `The ${mainIndex} index do NOT exist. Assuming this is a fresh deployment`
      );
    } else {
      options.logger.fatal(
        `Cannot query the meta information on the ${mainIndex} saved object index`
      );
      throw error;
    }
  }

  // if the .kibana index exists, ensure previous Kibana version is >= 8.18.0
  if (options.kibanaVersionCheck && indexDetails?.aliases) {
    // .kibana index exists and should have version aliases
    const previousKibanaVersion = extractVersionFromKibanaIndexAliases(indexDetails.aliases);
    if (!previousKibanaVersion) {
      throw new Error(
        `Cannot determine Kibana version from the ${mainIndex} aliases [${indexDetails.aliases}]. If you are running a Kibana version <= 7.11.0, please upgrade to 8.18.0 or 8.19.0 before upgrading to 9.x series`
      );
    }
    if (new SemVer(options.kibanaVersionCheck).compare(previousKibanaVersion) === 1) {
      const currentMajor = new SemVer(options.kibanaVersion).major;
      throw new Error(
        `Kibana ${previousKibanaVersion} deployment detected. Please upgrade to Kibana ${options.kibanaVersionCheck} or newer before upgrading to ${currentMajor}.x series.`
      );
    }
  }

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
  const indicesWithRelocatingTypes = indexDetails
    ? // the .kibana index exists, we might have to relocate some SO to different indices
      getIndicesInvolvedInRelocation(
        indexDetails?.mappings?._meta?.indexTypesMap ?? options.defaultIndexTypesMap,
        indexTypesMap
      )
    : // this is a fresh deployment, no indices involved in a relocation
      [];

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
  const appVersions = getVirtualVersionMap({
    types: options.typeRegistry.getAllTypes(),
    useModelVersionsOnly: true,
  });

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
      indexPrefix: indexName,
    };
  });

  return Promise.all(
    migrators.map(async (migrator) => {
      const startTime = performance.now();
      try {
        const result = await migrator.migrate();
        const duration = performance.now() - startTime;
        options.meter.record(duration, {
          'kibana.saved_objects.migrations.migrator': migrator.indexPrefix,
        });
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        options.meter.record(duration, {
          'kibana.saved_objects.migrations.migrator': migrator.indexPrefix,
          'error.type': error.message, // Ideally, we had codes for each error instead.
        });
        throw error;
      }
    })
  );
};
