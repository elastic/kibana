/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ElasticsearchClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { createEsFileClient } from './create_es_file_client';
import { FileClient } from './types';
import { ElasticsearchBlobStorageClient } from '../blob_storage_service';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FileDocument } from './file_metadata_client/adapters/es_index';

describe('When initializing file client via createESFileClient()', () => {
  let esClient: ElasticsearchClientMock;
  let logger: MockedLogger;

  beforeEach(() => {
    ElasticsearchBlobStorageClient.configureConcurrentTransfers(Infinity);
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  describe('and `indexIsAlias` argument is used', () => {
    let fileClient: FileClient;
    let searchResponse: estypes.SearchResponse<FileDocument<{}>>;

    beforeEach(() => {
      searchResponse = {
        took: 3,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 0,
          hits: [
            {
              _index: 'foo',
              _id: '123',
              _score: 1.0,
              _source: {
                file: {
                  name: 'foo.txt',
                  Status: 'READY',
                  created: '2023-03-27T20:45:31.490Z',
                  Updated: '2023-03-27T20:45:31.490Z',
                  FileKind: '',
                },
              },
            },
          ],
        },
      };

      esClient.search.mockResolvedValue(searchResponse);
      fileClient = createEsFileClient({
        logger,
        metadataIndex: 'file-meta',
        blobStorageIndex: 'file-data',
        elasticsearchClient: esClient,
        indexIsAlias: true,
      });
    });

    it('should use es.search() to retrieve file metadata', async () => {
      await fileClient.get({ id: '123' });
      expect(esClient.search).toHaveBeenCalledWith({
        body: {
          query: {
            term: {
              _id: '123',
            },
          },
          size: 1,
        },
        index: 'file-meta',
      });
    });

    it('should throw an error if file is not found', async () => {
      (searchResponse.hits.total as estypes.SearchTotalHits).value = 0;
      searchResponse.hits.hits = [];
      await expect(fileClient.get({ id: '123 ' })).rejects.toHaveProperty(
        'message',
        'File not found'
      );
    });
  });
});
