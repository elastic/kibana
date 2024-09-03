/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createId } from '@paralleldrive/cuid2';
import { encode, decode } from '@kbn/cbor';
import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ByteSizeValue } from '@kbn/config-schema';
import { defaults } from 'lodash';
import { Duplex, Writable, Readable } from 'stream';

import { GetResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { inspect } from 'util';
import { wrapErrorAndReThrow } from '../../../../file_client/utils';
import type { FileChunkDocument } from '../mappings';

type Callback = (error?: Error) => void;

export type ContentStreamEncoding = 'base64' | 'raw';

interface IndexRequestParams {
  data: Buffer;
  id: string;
  index: string;
  bid: string;
}

export interface ContentStreamParameters {
  /**
   * The maximum size allowed per chunk.
   *
   * @default 4mb
   */
  maxChunkSize?: string;
  /**
   * The file size in bytes. This can be used to optimize downloading.
   */
  size?: number;
}

export class ContentStream extends Duplex {
  private buffers: Buffer[] = [];
  private bytesBuffered = 0;

  private bytesRead = 0;
  private chunksRead = 0;
  private chunksWritten = 0;
  private maxChunkSize?: number;
  private parameters: Required<ContentStreamParameters>;

  /**
   * The number of bytes written so far.
   * Does not include data that is still queued for writing.
   */
  bytesWritten = 0;

  constructor(
    private readonly client: ElasticsearchClient,
    private id: undefined | string,
    private readonly index: string,
    private readonly logger: Logger,
    parameters: ContentStreamParameters = {},
    private readonly indexIsAlias: boolean = false
  ) {
    super();
    this.parameters = defaults(parameters, {
      encoding: 'base64',
      size: -1,
      maxChunkSize: '4mb',
    });
  }

  private getMaxContentSize(): number {
    return ByteSizeValue.parse(this.parameters.maxChunkSize).getValueInBytes();
  }

  private getMaxChunkSize() {
    if (!this.maxChunkSize) {
      this.maxChunkSize = this.getMaxContentSize();
      this.logger.debug(`Chunk size is ${this.maxChunkSize} bytes.`);
    }

    return this.maxChunkSize;
  }

  private async getChunkRealIndex(id: string): Promise<string> {
    const chunkDocMeta = await this.client.search({
      index: this.index,
      body: {
        size: 1,
        query: {
          term: {
            _id: id,
          },
        },
        _source: false, // suppress the document content
      },
    });

    const docIndex = chunkDocMeta.hits.hits?.[0]?._index;

    if (!docIndex) {
      const err = new Error(
        `Unable to determine index for file chunk id [${id}] in index (alias) [${this.index}]`
      );

      this.logger.error(err);
      throw err;
    }

    return docIndex;
  }

  private async readChunk(): Promise<[data: null | Buffer, last?: boolean]> {
    if (!this.id) {
      throw new Error('No document ID provided. Cannot read chunk.');
    }
    const id = this.getChunkId(this.chunksRead);
    const chunkIndex = this.indexIsAlias ? await this.getChunkRealIndex(id) : this.index;

    this.logger.debug(`Reading chunk #${this.chunksRead} from index [${chunkIndex}]`);

    try {
      const stream = await this.client.get(
        {
          id,
          index: chunkIndex,
          _source_includes: ['data', 'last'],
        },
        {
          asStream: true, // This tells the ES client to not process the response body in any way.
          headers: { accept: 'application/cbor' },
        }
      );

      const chunks: Buffer[] = [];
      for await (const chunk of stream as unknown as Readable) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const decodedChunkDoc: GetResponse<FileChunkDocument> | undefined = buffer.byteLength
        ? (decode(buffer) as GetResponse<FileChunkDocument>)
        : undefined;

      // Because `asStream` was used in retrieving the document, errors are also not be processed
      // and thus are returned "as is", so we check to see if an ES error occurred while attempting
      // to retrieve the chunk.
      if (decodedChunkDoc && ('error' in decodedChunkDoc || !decodedChunkDoc.found)) {
        const err = new Error(`Failed to retrieve chunk id [${id}] from index [${chunkIndex}]`);
        this.logger.error(err);
        this.logger.error(inspect(decodedChunkDoc, { depth: 5 }));
        throw err;
      }

      const source: undefined | FileChunkDocument = decodedChunkDoc?._source;

      const dataBuffer = source?.data as unknown as Buffer;
      return [dataBuffer?.byteLength ? dataBuffer : null, source?.last];
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        const readingHeadChunk = this.chunksRead <= 0;
        if (this.isSizeUnknown() && !readingHeadChunk) {
          // Assume there is no more content to read.
          return [null];
        }
        if (readingHeadChunk) {
          this.logger.error(`File not found (id: ${this.getHeadChunkId()}).`);
        }
      }
      throw e;
    }
  }

  private isSizeUnknown(): boolean {
    return this.parameters.size < 0;
  }

  private isRead() {
    const { size } = this.parameters;
    if (size > 0) {
      return this.bytesRead >= size;
    }
    return false;
  }

  _read() {
    this.readChunk()
      .then(([buffer, last]) => {
        if (!buffer) {
          this.logger.debug(`Chunk is empty.`);
          this.push(null);
          return;
        }

        this.push(buffer);
        this.chunksRead++;
        this.bytesRead += buffer.byteLength;

        if (this.isRead() || last) {
          this.logger.debug(`Read ${this.bytesRead} of ${this.parameters.size} bytes.`);
          this.push(null);
        }
      })
      .catch((err) => this.destroy(err));
  }

  private async removeChunks() {
    const bid = this.getId();
    this.logger.debug(`Clearing existing chunks for ${bid}`);
    await this.client.deleteByQuery({
      index: this.index,
      ignore_unavailable: true,
      query: {
        bool: {
          must: { match: { bid } },
        },
      },
    });
  }

  private getId(): string {
    if (!this.id) {
      this.id = createId();
    }
    return this.id;
  }

  private getHeadChunkId() {
    return `${this.getId()}.0`;
  }

  private getChunkId(chunkNumber = 0) {
    return chunkNumber === 0 ? this.getHeadChunkId() : `${this.getId()}.${chunkNumber}`;
  }

  private async indexChunk({ bid, data, id, index }: IndexRequestParams, last?: true) {
    await this.client
      .index(
        {
          id,
          index,
          op_type: 'create',
          document: encode({
            data,
            bid,
            // Mark it as last?
            ...(last ? { last } : {}),
            // Add `@timestamp` for Index Alias/DS?
            ...(this.indexIsAlias ? { '@timestamp': new Date().toISOString() } : {}),
          }),
        },
        {
          headers: {
            'content-type': 'application/cbor',
            accept: 'application/json',
          },
        }
      )
      .catch(wrapErrorAndReThrow.withMessagePrefix('ContentStream.indexChunk(): '));
  }

  /**
   * Holds a reference to the last written chunk without actually writing it to ES.
   *
   * This enables us to reliably determine what the real last chunk is at the cost
   * of holding, at most, 2 full chunks in memory.
   */
  private indexRequestBuffer: undefined | IndexRequestParams;

  private async writeChunk(data: Buffer) {
    const chunkId = this.getChunkId(this.chunksWritten);

    if (!this.indexRequestBuffer) {
      this.indexRequestBuffer = {
        id: chunkId,
        index: this.index,
        data,
        bid: this.getId(),
      };
      return;
    }

    this.logger.debug(`Writing chunk with ID "${this.indexRequestBuffer.id}".`);
    await this.indexChunk(this.indexRequestBuffer);
    // Hold a reference to the next buffer now that we indexed the previous one.
    this.indexRequestBuffer = {
      id: chunkId,
      index: this.index,
      data,
      bid: this.getId(),
    };
  }

  private async finalizeLastChunk() {
    if (!this.indexRequestBuffer) {
      return;
    }
    this.logger.debug(`Writing last chunk with id "${this.indexRequestBuffer.id}".`);
    await this.indexChunk(this.indexRequestBuffer, true);
    this.indexRequestBuffer = undefined;
  }

  private async flush(size = this.bytesBuffered) {
    const buffersToFlush: Buffer[] = [];
    let bytesToFlush = 0;

    /*
     Loop over each buffer, keeping track of how many bytes we have added
     to the array of buffers to be flushed. The array of buffers to be flushed
     contains buffers by reference, not copies. This avoids putting pressure on
     the CPU for copying buffers or for gc activity. Please profile performance
     with a large byte configuration and a large number of records (900k+)
     before changing this code.
    */
    while (this.buffers.length) {
      const remainder = size - bytesToFlush;
      if (remainder <= 0) {
        break;
      }
      const buffer = this.buffers.shift()!;
      const chunkedBuffer = buffer.slice(0, remainder);
      buffersToFlush.push(chunkedBuffer);
      bytesToFlush += chunkedBuffer.byteLength;

      if (buffer.byteLength > remainder) {
        this.buffers.unshift(buffer.slice(remainder));
      }
    }

    // We call Buffer.concat with the fewest number of buffers possible
    const chunk = Buffer.concat(buffersToFlush);

    if (!this.chunksWritten) {
      await this.removeChunks();
    }
    if (chunk.byteLength) {
      await this.writeChunk(chunk);
      this.chunksWritten++;
    }

    this.bytesWritten += chunk.byteLength;
    this.bytesBuffered -= bytesToFlush;
  }

  private async flushAllFullChunks() {
    const maxChunkSize = this.getMaxChunkSize();

    while (this.bytesBuffered >= maxChunkSize && this.buffers.length) {
      await this.flush(maxChunkSize);
    }
  }

  _write(chunk: Buffer | string, encoding: BufferEncoding, callback: Callback) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.bytesBuffered += buffer.byteLength;
    this.buffers.push(buffer);

    this.flushAllFullChunks()
      .then(() => callback())
      .catch(callback);
  }

  _final(callback: Callback) {
    this.flush()
      .then(() => this.finalizeLastChunk())
      .then(() => callback())
      .catch(callback);
  }

  /**
   * This ID can be used to retrieve or delete all of the file chunks but does
   * not necessarily correspond to an existing document.
   *
   * @note do not use this ID with anything other than a {@link ContentStream}
   * compatible implementation for reading blob-like structures from ES.
   *
   * @note When creating a new blob, this value may be undefined until the first
   * chunk is written.
   */
  public getContentReferenceId(): undefined | string {
    return this.id;
  }

  public getBytesWritten(): number {
    return this.bytesWritten;
  }
}

export interface ContentStreamArgs {
  client: ElasticsearchClient;
  /**
   * Provide base ID from which all chunks derive their IDs.
   */
  id?: string;

  /**
   * The Elasticsearch index name to read from or write to.
   */
  index: string;

  /**
   * Known size of the file we are reading. This value can be used to optimize
   * reading of the file.
   */
  logger: Logger;
  parameters?: ContentStreamParameters;
  /** indicates the index provided is an alias (changes how the content is retrieved internally) */
  indexIsAlias?: boolean;
}

function getContentStream({
  client,
  id,
  index,
  logger,
  parameters,
  indexIsAlias = false,
}: ContentStreamArgs) {
  return new ContentStream(client, id, index, logger, parameters, indexIsAlias);
}

export type WritableContentStream = Writable &
  Pick<ContentStream, 'getContentReferenceId' | 'getBytesWritten'>;

export function getWritableContentStream(args: ContentStreamArgs): WritableContentStream {
  return getContentStream(args);
}

export type ReadableContentStream = Readable;

export function getReadableContentStream(
  args: Omit<ContentStreamArgs, 'id'> & { id: string }
): ReadableContentStream {
  return getContentStream(args);
}
