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
const execPromise = promisify(exec);

import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  currentVersion,
  defaultKibanaIndex,
  getKibanaMigratorTestKit,
  startElasticsearch,
} from './kibana_migrator_test_kit';
import { delay } from './test_utils';
import { baselineTypes, getBaselineDocuments } from './kibana_migrator_test_kit.fixtures';

export const BASELINE_ELASTICSEARCH_VERSION = currentVersion;
export const BASELINE_DOCUMENTS_PER_TYPE_1K = 200;
export const BASELINE_DOCUMENTS_PER_TYPE_500K = 100_000;

export const BASELINE_TEST_ARCHIVE_1K = join(
  __dirname,
  'archives',
  `${BASELINE_ELASTICSEARCH_VERSION}_baseline_${
    (BASELINE_DOCUMENTS_PER_TYPE_1K * baselineTypes.length) / 1000
  }k_docs.zip`
);

export const BASELINE_TEST_ARCHIVE_500K = join(
  __dirname,
  'archives',
  `${BASELINE_ELASTICSEARCH_VERSION}_baseline_${
    (BASELINE_DOCUMENTS_PER_TYPE_500K * baselineTypes.length) / 1000
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
  await delay(30);

  await compressBaselineArchive(basePath, dataArchive);
  console.log(`Archive created in: ${(Date.now() - startTime) / 1000} seconds`, dataArchive);

  // leave command line enough time to finish creating + closing ZIP file
  await delay(30);

  await esServer.stop();
  await delay(10);
  await fs.rm(basePath, { recursive: true, force: true });
};

const compressBaselineArchive = async (esFolder: string, archiveFile: string) => {
  const dataFolder = join(esFolder, 'es-test-cluster', 'data');
  const cmd = `ditto -c -k --sequesterRsrc --keepParent ${dataFolder}  ${archiveFile}`;
  await execPromise(cmd);
};
