/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LoadActionPerfOptions } from '@kbn/es-archiver';
import { IndexStats } from '@kbn/es-archiver/src/lib/stats';
import { coreWorkerFixtures } from './core_fixtures';
import { getEsArchiver } from '../../../common/services';

export interface EsArchiverFixture {
  /**
   * Loads an Elasticsearch archive if the specified data index is not present.
   * @param name The name of the archive to load.
   * @param performance An object of type LoadActionPerfOptions to measure and
   * report performance metrics during the load operation.
   * @returns A Promise that resolves to an object containing index statistics.
   */
  loadIfNeeded: (
    name: string,
    performance?: LoadActionPerfOptions | undefined
  ) => Promise<Record<string, IndexStats>>;
}

export const esArchiverFixture = coreWorkerFixtures.extend<{}, { esArchiver: EsArchiverFixture }>({
  /**
   * Provides utilities for managing test data in Elasticsearch. The "loadIfNeeded" method
   * optimizes test execution by loading data archives only if required, avoiding redundant
   * data ingestion.
   *
   * Note: In order to speedup test execution and avoid the overhead of deleting the data
   * we only expose capability to ingest the data indexes.
   */
  esArchiver: [
    ({ log, esClient, kbnClient }, use) => {
      const esArchiverInstance = getEsArchiver(esClient, kbnClient, log);
      const loadIfNeeded = async (name: string, performance?: LoadActionPerfOptions | undefined) =>
        esArchiverInstance!.loadIfNeeded(name, performance);

      use({ loadIfNeeded });
    },
    { scope: 'worker' },
  ],
});
