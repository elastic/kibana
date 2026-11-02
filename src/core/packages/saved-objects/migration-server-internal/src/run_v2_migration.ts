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
  type MigrationResult,
  type SavedObjectsMigrationConfigType,
  type SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';
import Semver, { SemVer } from 'semver';
import { pick } from 'lodash';
import type { Histogram } from '@opentelemetry/api';
import type { DocumentMigrator } from './document_migrator';
import { buildActiveMappings, createIndexMap } from './core';
import { runResilientMigrator } from './run_resilient_migrator';
import { LOW_MEMORY_BATCH_SIZE, isMemoryConstrained } from './low_memory';
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

  // we will store model versions instead of hashes (to be FIPS compliant)
  const appVersions = getVirtualVersionMap({
    types: options.typeRegistry.getAllTypes(),
    useModelVersionsOnly: true,
  });

  // On memory-constrained instances, migrations are prone to OOM/timeout while
  // replaying bulk writes. Back off by running index migrators sequentially and
  // reducing the batch size, trading a longer migration for a lower memory
  // footprint.
  const memoryConstrained = isMemoryConstrained();
  const migrationConfig: SavedObjectsMigrationConfigType = memoryConstrained
    ? {
        ...options.migrationConfig,
        batchSize: Math.min(options.migrationConfig.batchSize, LOW_MEMORY_BATCH_SIZE),
      }
    : options.migrationConfig;

  if (memoryConstrained) {
    options.logger.info(
      'Kibana is running below the recommended minimum of 2GB of memory. Upgrade migrations will still complete, but will take longer. We recommend running Kibana with at least 2GB of memory.'
    );
  }

  const migrators = Array.from(new Set(Object.keys(indexMap))).map((indexName, i) => {
    return {
      migrate: (): Promise<MigrationResult> => {
        // a migrator's index might no longer have any associated types to it
        const typeDefinitions = indexMap[indexName]?.typeMappings ?? {};

        const indexTypes = Object.keys(typeDefinitions);
        // store only the model versions of SO types that belong to the index
        const mappingVersions = pick(appVersions, indexTypes);

        const _meta: IndexMappingMeta = {
          mappingVersions,
        };

        return runResilientMigrator({
          client: options.elasticsearchClient,
          kibanaVersion: options.kibanaVersion,
          indexTypes,
          hashToVersionMap: options.hashToVersionMap,
          waitForMigrationCompletion: options.waitForMigrationCompletion,
          targetIndexMappings: buildActiveMappings(typeDefinitions, _meta),
          logger: options.logger,
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
          migrationsConfig: migrationConfig,
          typeRegistry: options.typeRegistry,
          docLinks: options.docLinks,
          esCapabilities: options.esCapabilities,
        });
      },
      indexPrefix: indexName,
    };
  });

  const runMigrator = async (migrator: (typeof migrators)[number]): Promise<MigrationResult> => {
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
  };

  if (memoryConstrained) {
    // Run migrators one at a time so that only a single index migration holds
    // documents in memory at any given time.
    const results: MigrationResult[] = [];
    for (const migrator of migrators) {
      results.push(await runMigrator(migrator));
    }
    return results;
  }

  return Promise.all(migrators.map(runMigrator));
};
