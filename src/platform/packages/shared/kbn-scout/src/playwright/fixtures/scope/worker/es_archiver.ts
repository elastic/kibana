/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoadActionPerfOptions } from '@kbn/es-archiver';
import type { IndexStats } from '@kbn/es-archiver/src/lib/stats';
import { coreWorkerFixtures } from './core_fixtures';
import type { LoadSavedObjectsOptions } from '../../../../common/services';
import {
  getEsArchiver,
  getEsClientForSystemIndices,
  loadSavedObjectsArchive,
  unloadSavedObjectsArchive,
} from '../../../../common/services';

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

  /**
   * Loads a "saved objects data-only" es-archiver archive (a `data.json[.gz]` whose
   * documents all target the `.kibana*` saved object indices) into the *existing*
   * saved object indices.
   *
   * Unlike `loadIfNeeded`, which no-ops when the target index already exists (always
   * true for `.kibana*`), this purges any documents of the archive's own saved object
   * types and then indexes the archive documents, restoring the pristine fixture state
   * without deleting or recreating the indices. Writes are performed with a
   * system-indices-capable client, since the regular `elastic` superuser cannot write
   * to the restricted saved object indices.
   *
   * Prefer `kbnClient.importExport` when your fixtures can be expressed as importable
   * saved objects; use this only for raw documents the saved objects HTTP APIs cannot
   * produce (e.g. `legacy-url-alias` docs, objects with `originId`, or pre-seeded
   * multi-namespace shares).
   *
   * @param name Repo-relative path to the archive directory.
   * @param options See {@link LoadSavedObjectsOptions}.
   */
  loadSavedObjects: (name: string, options?: LoadSavedObjectsOptions) => Promise<void>;

  /**
   * Deletes every document contained in a "saved objects data-only" archive from the
   * saved object indices. Missing documents are ignored. Counterpart to
   * `loadSavedObjects` for suite-level cleanup.
   *
   * @param name Repo-relative path to the archive directory.
   */
  unloadSavedObjects: (name: string) => Promise<void>;
}

export const esArchiverFixture = coreWorkerFixtures.extend<{}, { esArchiver: EsArchiverFixture }>({
  /**
   * Provides utilities for managing test data in Elasticsearch. The "loadIfNeeded" method
   * optimizes test execution by loading data archives only if required, avoiding redundant
   * data ingestion.
   *
   * Note: In order to speedup test execution and avoid the overhead of deleting the data
   * we only expose capability to ingest the data indexes. The "loadSavedObjects" /
   * "unloadSavedObjects" methods are the exception: they reseed saved-objects data-only
   * archives into the existing `.kibana*` indices, scoped to the archive's own documents.
   */
  esArchiver: [
    ({ log, esClient, config }, use) => {
      const esArchiverInstance = getEsArchiver(esClient, log);
      const loadIfNeeded = async (name: string, performance?: LoadActionPerfOptions | undefined) =>
        esArchiverInstance!.loadIfNeeded(name, performance);

      // resolved lazily so workers that never touch saved objects archives
      // do not create the privileged client
      const loadSavedObjects = async (name: string, options?: LoadSavedObjectsOptions) =>
        loadSavedObjectsArchive(getEsClientForSystemIndices(config, log), log, name, options);
      const unloadSavedObjects = async (name: string) =>
        unloadSavedObjectsArchive(getEsClientForSystemIndices(config, log), log, name);

      use({ loadIfNeeded, loadSavedObjects, unloadSavedObjects });
    },
    { scope: 'worker' },
  ],
});
