/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { EsIndexFilesMetadataClient } from '../..';
import { FileMetadata } from '@kbn/shared-ux-file-types';
import { estypes } from '@elastic/elasticsearch';

describe('EsIndexFilesMetadataClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: Logger;

  const generateMetadata = (): FileMetadata => {
    return {
      created: '2023-06-26T17:33:35.968Z',
      Updated: '2023-06-26T17:33:35.968Z',
      Status: 'READY',
      name: 'lol.gif',
      mime_type: 'image/gif',
      extension: 'gif',
      FileKind: 'none',
      size: 134751,
    };
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    logger = loggingSystemMock.createLogger();
  });

  describe('and `indexIsAlias` prop is `true`', () => {
    let metaClient: EsIndexFilesMetadataClient;

    beforeEach(() => {
      metaClient = new EsIndexFilesMetadataClient('foo', esClient, logger, true);
    });

    it('should NOT create index', async () => {
      esClient.index.mockResolvedValue({ _id: '123' } as estypes.WriteResponseBase);
      await metaClient.create({ id: '123', metadata: generateMetadata() });

      expect(logger.debug).toHaveBeenCalledWith(
        'No need to create index [foo] as it is an Alias or DS.'
      );
    });

    it('should retrieve backing index on update', async () => {
      // For `.getBackingIndex()`
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _index: 'foo-00001' } as estypes.SearchHit] },
      } as estypes.SearchResponse);
      // For `.get()`
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _source: { file: generateMetadata() } } as estypes.SearchHit] },
      } as estypes.SearchResponse);

      await metaClient.update({ id: '123', metadata: generateMetadata() });

      expect(esClient.search).toHaveBeenCalledWith({
        body: {
          _source: false,
          query: {
            term: {
              _id: '123',
            },
          },
          size: 1,
        },
        index: 'foo',
      });
      expect(esClient.update).toHaveBeenCalledWith(expect.objectContaining({ index: 'foo-00001' }));
    });

    it('should write @timestamp on create', async () => {
      esClient.index.mockResolvedValue({ _id: '123' } as estypes.WriteResponseBase);
      await metaClient.create({ id: '123', metadata: generateMetadata() });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            '@timestamp': expect.any(String),
          }),
        })
      );
    });
  });
});
