/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { ElasticsearchBlobStorageClient } from '../blob_storage_service';
import { FileClientImpl } from './file_client';
import type { FileClient } from './types';
import { EsIndexFilesMetadataClient } from './file_metadata_client';

const NO_FILE_KIND = 'none';

/**
 * Arguments to create an ES file client.
 */
export interface CreateEsFileClientArgs {
  /**
   * The name of the ES index that will store file metadata.
   */
  metadataIndex: string;
  /**
   * The name of the ES index that will store file contents.
   */
  blobStorageIndex: string;
  /**
   * An elasticsearch client that will be used to interact with the cluster
   */
  elasticsearchClient: ElasticsearchClient;
  /**
   * The maximum file size to be write
   */
  maxSizeBytes?: number;
  /**
   * A logger for debuggin purposes
   */
  logger: Logger;
}

/**
 * A utility function for creating an instance of {@link FileClient}
 * that will speak with ES indices only for file functionality.
 *
 * @note This client is not intended to be aware of {@link FileKind}s.
 *
 * @param arg - See {@link CreateEsFileClientArgs}
 */
export function createEsFileClient(arg: CreateEsFileClientArgs): FileClient {
  const { blobStorageIndex, elasticsearchClient, logger, metadataIndex, maxSizeBytes } = arg;
  return new FileClientImpl(
    {
      id: NO_FILE_KIND,
      http: {},
      maxSizeBytes,
    },
    new EsIndexFilesMetadataClient(metadataIndex, elasticsearchClient, logger),
    new ElasticsearchBlobStorageClient(elasticsearchClient, blobStorageIndex, undefined, logger),
    undefined,
    undefined,
    logger
  );
}
