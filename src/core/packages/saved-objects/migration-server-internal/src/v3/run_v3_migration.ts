/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Histogram } from '@opentelemetry/api';
import type { Logger } from '@kbn/logging';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import { isMemoryConstrained, LOW_MEMORY_BATCH_SIZE } from '../low_memory';
import { buildMigratorConfigs } from '../zdt/utils';
import { createContext, type CreateContextParams } from './context';
import { createIO } from './io';
import { migrateIndex } from './migrate_index';

export interface RunV3MigrationOpts extends Omit<CreateContextParams, 'indexPrefix' | 'types'> {
  /** The main Kibana index prefix, e.g. `.kibana`. Types may be stored in other indices. */
  kibanaIndexPrefix: string;
  logger: Logger;
  /** The OTel Histogram metric to record the duration of each migrator */
  meter?: Histogram;
}

/**
 * Runs the v3 migration of every saved objects index.
 *
 * The Elasticsearch client determines the target cluster (or tenant): this
 * function holds no state and can be called on demand, e.g. to bootstrap the
 * indices of a new tenant while Kibana is running.
 */
export const runV3Migration = async ({
  kibanaIndexPrefix,
  logger,
  meter,
  ...options
}: RunV3MigrationOpts): Promise<MigrationResult[]> => {
  const memoryConstrained = isMemoryConstrained();
  const migrationConfig = memoryConstrained
    ? {
        ...options.migrationConfig,
        batchSize: Math.min(options.migrationConfig.batchSize, LOW_MEMORY_BATCH_SIZE),
      }
    : options.migrationConfig;

  if (memoryConstrained) {
    logger.info(
      'Kibana is running below the recommended minimum of 2GB of memory. Upgrade migrations will still complete, but will take longer. We recommend running Kibana with at least 2GB of memory.'
    );
  }

  (
    [
      ['discardUnknownObjects', 'unknown'],
      ['discardCorruptObjects', 'corrupt'],
    ] as const
  )
    .filter(([flag]) => {
      const value = migrationConfig[flag];
      return value !== undefined && value !== options.kibanaVersion;
    })
    .forEach(([flag, kind]) =>
      logger.warn(
        `The flag \`migrations.${flag}\` is defined but does not match the current kibana version; ${kind} objects will NOT be discarded.`
      )
    );

  const migrators = buildMigratorConfigs({
    kibanaIndexPrefix,
    typeRegistry: options.typeRegistry,
  }).map(({ indexPrefix, types }) => async (): Promise<MigrationResult> => {
    const context = createContext({ ...options, migrationConfig, indexPrefix, types });
    const startTime = performance.now();
    const record = (attributes: Record<string, string> = {}) =>
      meter?.record(performance.now() - startTime, {
        'kibana.saved_objects.migrations.migrator': indexPrefix,
        ...attributes,
      });
    try {
      const result = await migrateIndex({ context, io: createIO(context), logger });
      record();
      return result;
    } catch (error) {
      record({ 'error.type': error.message });
      throw error;
    }
  });

  // on memory-constrained instances, migrating the indices one at a time avoids running out of memory
  return memoryConstrained
    ? migrators.reduce<Promise<MigrationResult[]>>(
        async (results, migrate) => [...(await results), await migrate()],
        Promise.resolve([])
      )
    : Promise.allSettled(migrators.map((migrate) => migrate())).then(toResults);
};

/** Waits for every index to settle, so that no migration keeps running once the caller gets an error. */
const toResults = (settled: Array<PromiseSettledResult<MigrationResult>>): MigrationResult[] => {
  const errors = settled.flatMap((result): Error[] =>
    result.status === 'rejected' ? [result.reason] : []
  );
  if (errors.length > 1) {
    throw new Error(errors.map(({ message }) => message).join('\n'));
  }
  if (errors.length === 1) {
    throw errors[0];
  }
  return settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
};
