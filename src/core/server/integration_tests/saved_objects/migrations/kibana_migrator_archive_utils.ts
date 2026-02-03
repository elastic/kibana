/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import { join } from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { setTimeout as timer } from 'timers/promises';
const execPromise = promisify(exec);

import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  defaultKibanaIndex,
  getKibanaMigratorTestKit,
  startElasticsearch,
} from '@kbn/migrator-test-kit';
import { baselineTypes, getBaselineDocuments } from '@kbn/migrator-test-kit/fixtures';

export const BASELINE_ELASTICSEARCH_VERSION = '9.4.0';
export const BASELINE_DOCUMENTS_PER_TYPE_SMALL = 200;
export const BASELINE_DOCUMENTS_PER_TYPE_LARGE = 100_000;
// we discard the second half with exclude on upgrade (firstHalf !== true)
// then we discard half all multiples of 100 (1% of them)
export const BASELINE_COMPLEX_DOCUMENTS_LARGE_AFTER =
  BASELINE_DOCUMENTS_PER_TYPE_LARGE / 2 - BASELINE_DOCUMENTS_PER_TYPE_LARGE / 2 / 100;

export const BASELINE_TEST_ARCHIVE_SMALL = join(
  __dirname,
  'archives',
  `${BASELINE_ELASTICSEARCH_VERSION}_baseline_${
    (BASELINE_DOCUMENTS_PER_TYPE_SMALL * baselineTypes.length) / 1000
  }k_docs.zip`
);

export const BASELINE_TEST_ARCHIVE_LARGE = join(
  __dirname,
  'archives',
  `${BASELINE_ELASTICSEARCH_VERSION}_baseline_${
    (BASELINE_DOCUMENTS_PER_TYPE_LARGE * baselineTypes.length) / 1000
  }k_docs.zip`
);

const DEFAULT_BATCH_SIZE = 5000;

interface CreateBaselineArchiveParams {
  dataArchive: string;
  esVersion?: string;
  kibanaIndex?: string;
  types?: Array<SavedObjectsType<any>>;
  documents?: SavedObjectsBulkCreateObject[];
  batchSize?: number;
  basePath?: string;
}

export const createBaselineArchive = async ({
  dataArchive,
  esVersion,
  kibanaIndex = defaultKibanaIndex,
  types = baselineTypes,
  documents = getBaselineDocuments(),
  batchSize = DEFAULT_BATCH_SIZE,
  basePath = join(__dirname, `target`),
}: CreateBaselineArchiveParams) => {
  const startTime = Date.now();
  const esServer = await startElasticsearch({ esVersion, basePath });

  const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
    kibanaIndex,
    types,
  });

  await runMigrations();

  const batches = Math.ceil(documents.length / batchSize);

  for (let i = 0; i < batches; ++i) {
    console.log(`Indexing up to ${batchSize} docs (batch ${i + 1} of ${batches})`);
    await savedObjectsRepository.bulkCreate(documents.slice(batchSize * i, batchSize * (i + 1)), {
      refresh: 'wait_for',
    });
  }

  // wait a bit more to make sure everything's persisted to disk
  await timer(30_000);

  await compressBaselineArchive(basePath, dataArchive);
  console.log(`Archive created in: ${(Date.now() - startTime) / 1000} seconds`, dataArchive);

  // leave command line enough time to finish creating + closing ZIP file
  await timer(30_000);

  await esServer.stop();
  await timer(10_000);
  await fs.rm(basePath, { recursive: true, force: true });
};

const compressBaselineArchive = async (esFolder: string, archiveFile: string) => {
  const baseName = 'data';
  const dataFolder = join(esFolder, 'es-test-cluster', baseName);
  const parentDir = join(dataFolder, '..');
  const cmd = `zip -rq "${archiveFile}" "${baseName}"`;
  await execPromise(cmd, {
    cwd: parentDir,
  });
};
