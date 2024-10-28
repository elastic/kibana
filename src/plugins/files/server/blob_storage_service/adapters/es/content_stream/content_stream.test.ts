/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { set } from '@kbn/safer-lodash-set';
import { Readable } from 'stream';
import { encode, decode } from '@kbn/cbor';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ContentStream, ContentStreamEncoding, ContentStreamParameters } from './content_stream';
import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FileDocument } from '../../../../file_client/file_metadata_client/adapters/es_index';
import { IndexRequest } from '@elastic/elasticsearch/lib/api/types';

describe('ContentStream', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: Logger;
  let stream: ContentStream;

  function toReadable(...args: unknown[]) {
    return Readable.from([...args.map(encode)]) as unknown as GetResponse;
  }

  const getContentStream = ({
    id = 'something',
    index = 'somewhere',
    params = {
      encoding: 'base64' as ContentStreamEncoding,
      size: 1,
    } as ContentStreamParameters,
    indexIsAlias = false,
  } = {}) => {
    return new ContentStream(client, id, index, logger, params, indexIsAlias);
  };

  beforeEach(() => {
    client = elasticsearchServiceMock.createClusterClient().asInternalUser;
    logger = loggingSystemMock.createLogger();
    client.get.mockResponse(
      toReadable(set({ found: true }, '_source.data', Buffer.from('some content')))
    );
  });

  describe('read', () => {
    describe('with `indexIsAlias` set to `true`', () => {
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
              },
            ],
          },
        };

        client.search.mockResolvedValue(searchResponse);
      });

      it('should use es.search() to find chunk index', async () => {
        stream = getContentStream({ params: { size: 1 }, indexIsAlias: true });
        const data = await new Promise((resolve) => stream.once('data', resolve));

        expect(client.search).toHaveBeenCalledWith({
          body: {
            _source: false,
            query: {
              term: {
                _id: 'something.0',
              },
            },
            size: 1,
          },
          index: 'somewhere',
        });
        expect(data).toEqual(Buffer.from('some content'));
      });

      it('should throw if chunk is not found', async () => {
        searchResponse.hits.hits = [];
        stream = getContentStream({ params: { size: 1 }, indexIsAlias: true });

        const readPromise = new Promise((resolve, reject) => {
          stream.once('data', resolve);
          stream.once('error', reject);
        });

        await expect(readPromise).rejects.toHaveProperty(
          'message',
          'Unable to determine index for file chunk id [something.0] in index (alias) [somewhere]'
        );
      });
    });

    describe('with `indexIsAlias` set to `false`', () => {
      beforeEach(() => {
        stream = getContentStream({ params: { size: 1 } });
      });

      it('should perform a search using index and the document id', async () => {
        await new Promise((resolve) => stream.once('data', resolve));

        expect(client.get).toHaveBeenCalledTimes(1);

        const [[request]] = client.get.mock.calls;
        expect(request).toHaveProperty('index', 'somewhere');
        expect(request).toHaveProperty('id', 'something.0');
      });

      it('should read the document contents', async () => {
        const data = await new Promise((resolve) => stream.once('data', resolve));
        expect(data).toEqual(Buffer.from('some content'));
      });

      it('should be an empty stream on empty response', async () => {
        client.get.mockResponseOnce(toReadable());
        const onData = jest.fn();

        stream.on('data', onData);
        await new Promise((resolve) => stream.once('end', resolve));

        expect(onData).not.toHaveBeenCalled();
      });

      it('should emit an error event', async () => {
        client.get.mockRejectedValueOnce('some error');

        stream.read();
        const error = await new Promise((resolve) => stream.once('error', resolve));

        expect(error).toBe('some error');
      });

      it('should decode base64 encoded content', async () => {
        client.get.mockResponseOnce(
          toReadable(set({ found: true }, '_source.data', Buffer.from('encoded content')))
        );
        const data = await new Promise((resolve) => stream.once('data', resolve));

        expect(data).toEqual(Buffer.from('encoded content'));
      });

      it('should compound content from multiple chunks', async () => {
        const [one, two, three] = ['12', '34', '56'].map(Buffer.from);
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', one)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', two)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', three)));

        stream = getContentStream({
          params: { size: 6 },
        });

        let data = '';
        for await (const chunk of stream) {
          data += chunk;
        }

        expect(data).toEqual('123456');
        expect(client.get).toHaveBeenCalledTimes(3);

        const [[request1], [request2], [request3]] = client.get.mock.calls;

        expect(request1).toHaveProperty('index', 'somewhere');
        expect(request1).toHaveProperty('id', 'something.0');
        expect(request2).toHaveProperty('index', 'somewhere');
        expect(request2).toHaveProperty('id', 'something.1');
        expect(request3).toHaveProperty('index', 'somewhere');
        expect(request3).toHaveProperty('id', 'something.2');
      });

      it('should stop reading on empty chunk', async () => {
        const [one, two, three] = ['12', '34', ''].map(Buffer.from);
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', one)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', two)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', three)));
        stream = getContentStream({ params: { size: 12 } });
        let data = '';
        for await (const chunk of stream) {
          data += chunk;
        }

        expect(data).toEqual('1234');
        expect(client.get).toHaveBeenCalledTimes(3);
      });

      it('should read while chunks are present when there is no size', async () => {
        const [one, two] = ['12', '34'].map(Buffer.from);
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', one)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', two)));
        client.get.mockResponseOnce(toReadable({ found: true }));
        stream = getContentStream({ params: { size: undefined } });
        let data = '';
        for await (const chunk of stream) {
          data += chunk;
        }

        expect(data).toEqual('1234');
        expect(client.get).toHaveBeenCalledTimes(3);
      });

      it('should decode every chunk separately', async () => {
        const [one, two, three, four] = ['12', '34', '56', ''].map(Buffer.from);
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', one)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', two)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', three)));
        client.get.mockResponseOnce(toReadable(set({ found: true }, '_source.data', four)));
        stream = getContentStream({ params: { size: 12 } });
        let data = '';
        for await (const chunk of stream) {
          data += chunk;
        }

        expect(data).toEqual('123456');
      });
    });
  });

  describe('write', () => {
    beforeEach(() => {
      stream = getContentStream({ params: { size: 1 } });
    });
    it('should not send a request until stream is closed', () => {
      stream.write('something');

      expect(client.update).not.toHaveBeenCalled();
    });

    it('should provide a document ID after writing to a destination', async () => {
      stream = new ContentStream(client, undefined, 'somewhere', logger);
      expect(stream.getContentReferenceId()).toBe(undefined);
      stream.end('some data');
      await new Promise((resolve) => stream.once('finish', resolve));
      expect(stream.getContentReferenceId()).toEqual(expect.any(String));
    });

    it('should send the contents when stream ends', async () => {
      stream.write('123');
      stream.write('456');
      stream.end();
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.index).toHaveBeenCalledTimes(1);

      const [[request]] = client.index.mock.calls;

      expect(request).toHaveProperty('id', 'something.0');
      expect(request).toHaveProperty('index', 'somewhere');
      expect(request).toHaveProperty(
        'document',
        encode({ data: Buffer.from('123456'), bid: 'something', last: true })
      );
    });

    it('should update a number of written bytes', async () => {
      stream.write('123');
      stream.write('456');
      stream.end();
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(stream.bytesWritten).toBe(6);
    });

    it('should emit an error event', async () => {
      client.index.mockRejectedValueOnce(new Error('some error'));

      stream.end('data');
      const error = await new Promise((resolve) => stream.once('error', resolve));

      expect((error as Error).toString()).toEqual(
        'FilesPluginError: ContentStream.indexChunk(): some error'
      );
    });

    it('should remove all previous chunks before writing', async () => {
      stream.end('12345');
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.deleteByQuery).toHaveBeenCalledTimes(1);

      const [[request]] = client.deleteByQuery.mock.calls;

      expect(request).toHaveProperty('index', 'somewhere');
      expect(request).toHaveProperty('query.bool.must.match.bid', 'something');
    });

    it('should split data into chunks', async () => {
      stream = getContentStream({ params: { maxChunkSize: '3B' } });
      stream.end('123456789');
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.index).toHaveBeenCalledTimes(3);
      expect(client.index).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          document: encode({ data: Buffer.from('123'), bid: 'something' }),
          id: 'something.0',
          index: 'somewhere',
        }),
        expect.objectContaining({
          headers: { accept: 'application/json', 'content-type': 'application/cbor' },
        })
      );
      expect(client.index).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: 'something.1',
          index: 'somewhere',
          document: encode({ data: Buffer.from('456'), bid: 'something' }),
        }),
        expect.objectContaining({
          headers: { accept: 'application/json', 'content-type': 'application/cbor' },
        })
      );
      expect(client.index).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          id: 'something.2',
          index: 'somewhere',
          document: encode({ data: Buffer.from('789'), bid: 'something', last: true }),
        }),
        expect.objectContaining({
          headers: { accept: 'application/json', 'content-type': 'application/cbor' },
        })
      );
    });

    it('should encode every chunk separately', async () => {
      stream = getContentStream({ params: { maxChunkSize: '3B' } });
      stream.end('12345678');
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.index).toHaveBeenCalledTimes(3);
      expect(client.index).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: 'something.0',
          index: 'somewhere',
          document: encode({
            data: Buffer.from('123'),
            bid: 'something',
          }),
        }),
        expect.objectContaining({
          headers: { accept: 'application/json', 'content-type': 'application/cbor' },
        })
      );
      expect(client.index).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: 'something.1',
          index: 'somewhere',
          document: encode({
            data: Buffer.from('456'),
            bid: 'something',
          }),
        }),
        expect.objectContaining({
          headers: { accept: 'application/json', 'content-type': 'application/cbor' },
        })
      );
      expect(client.index).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          id: 'something.2',
          index: 'somewhere',
          document: encode({
            data: Buffer.from('78'),
            bid: 'something',
            last: true,
          }),
        }),
        expect.objectContaining({
          headers: { accept: 'application/json', 'content-type': 'application/cbor' },
        })
      );
    });

    it('should clear the job contents on writing empty data', async () => {
      stream.end();
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(client.index).toHaveBeenCalledTimes(0);

      const [[deleteRequest]] = client.deleteByQuery.mock.calls;

      expect(deleteRequest).toHaveProperty('query.bool.must.match.bid', 'something');
    });

    it('should write @timestamp if `indexIsAlias` is true', async () => {
      stream = new ContentStream(client, undefined, 'somewhere', logger, undefined, true);
      stream.end('some data');
      await new Promise((resolve) => stream.once('finish', resolve));
      const docBuffer = (client.index.mock.calls[0][0] as IndexRequest).document as Buffer;
      const docData = decode(docBuffer);

      expect(docData).toHaveProperty('@timestamp');
    });
  });
});
