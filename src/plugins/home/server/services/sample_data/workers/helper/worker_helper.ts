/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/logging';
import { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import { IClusterClient } from '@kbn/core-elasticsearch-server';
import { Worker } from 'worker_threads';
import Path from 'path';
import { SavedObjectsRequestHandlerContext } from '@kbn/core-saved-objects-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { bulkUpload, createDataView, createIndex, deleteIndex } from '../../lib';

export interface WorkerData {
  numberOfDocuments: number;
  numberOfFields?: number;
  additionalFormat?: string;
  fieldFormat?: string;
}

export const clearIndex = async (esClient: IClusterClient, indexName: string) => {
  await deleteIndex(esClient, indexName);
  await createIndex(esClient, indexName);
};

export const onMessageReceived = async (
  message: any,
  uploadCallback: (items: string) => void,
  doneCallback: () => Promise<{ errors: SavedObjectsImportFailure[] }>,
  logger: Logger
) => {
  try {
    switch (message.status) {
      case 'GENERATED_ITEMS':
        const { items } = message;
        await uploadCallback(items);
        break;
      case 'DONE':
        const result = await doneCallback();
        if (result.errors.length > 0) {
          logger.error('Error occurred while creating a data view');
        }
        break;
      case 'ERROR':
        logger.error('Error occurred while generating documents for ES');
        break;
    }
  } catch (e) {
    logger.error('Error occurred while generating documents for ES');
  }
};

export const initializeWorker = async (
  workerName: string,
  workerData: WorkerData,
  esClient: IClusterClient,
  savedObjects: SavedObjectsRequestHandlerContext,
  savedObjectsClient: SavedObjectsClientContract,
  indexName: string,
  logger: Logger
) => {
  const worker = new Worker(Path.join(__dirname, `../workers/${workerName}.js`), {
    workerData,
  });

  let delay = 0;
  let index = 0;
  const uploadCallback = (items: string) => {
    setTimeout(() => {
      bulkUpload(esClient, indexName, items);
    }, delay);
    // backoff, kinda
    index++;
    delay = index * 500;
  };
  const doneCallback = async () => {
    return createDataView(indexName, `${indexName} Data View`, savedObjects, savedObjectsClient);
  };
  worker.on('message', (message) =>
    onMessageReceived(message, uploadCallback, doneCallback, logger)
  );
  worker.on('error', (message) => {
    logger.error(message);
  });
  return worker;
};
