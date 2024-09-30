/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import Path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { getKibanaMigratorTestKit, startElasticsearch } from './kibana_migrator_test_kit';
import { delay } from './test_utils';

const DEFAULT_BATCH_SIZE = 100000;

interface CreateBaselineArchiveParams {
  kibanaIndex: string;
  types: Array<SavedObjectsType<any>>;
  documents: SavedObjectsBulkCreateObject[];
  batchSize?: number;
  esBaseFolder?: string;
  dataArchive: string;
}

export const createBaselineArchive = async ({
  types,
  documents,
  kibanaIndex,
  batchSize = DEFAULT_BATCH_SIZE,
  esBaseFolder = Path.join(__dirname, `target`),
  dataArchive,
}: CreateBaselineArchiveParams) => {
  const startTime = Date.now();
  const esServer = await startElasticsearch({ basePath: esBaseFolder });

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

  await compressBaselineArchive(esBaseFolder, dataArchive);
  console.log(`Archive created in: ${(Date.now() - startTime) / 1000} seconds`, dataArchive);
  await delay(200);
  await esServer.stop();
  // await fs.rm(esBaseFolder, { recursive: true });
};

const compressBaselineArchive = async (esFolder: string, archiveFile: string) => {
  const dataFolder = Path.join(esFolder, 'es-test-cluster');
  const cmd = `cd ${dataFolder} && zip -r ${archiveFile} data -x ".DS_Store" -x "__MACOSX"`;
  await execPromise(cmd);
};
