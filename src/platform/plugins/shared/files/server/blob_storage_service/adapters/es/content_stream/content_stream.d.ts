import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Writable, Readable } from 'stream';
import { Duplex } from 'stream';
type Callback = (error?: Error) => void;
export type ContentStreamEncoding = 'base64' | 'raw';
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
export declare class ContentStream extends Duplex {
    private readonly client;
    private id;
    private readonly index;
    private readonly logger;
    private readonly indexIsAlias;
    private buffers;
    private bytesBuffered;
    private bytesRead;
    private chunksRead;
    private chunksWritten;
    private maxChunkSize?;
    private parameters;
    /**
     * The number of bytes written so far.
     * Does not include data that is still queued for writing.
     */
    bytesWritten: number;
    constructor(client: ElasticsearchClient, id: undefined | string, index: string, logger: Logger, parameters?: ContentStreamParameters, indexIsAlias?: boolean);
    private getMaxContentSize;
    private getMaxChunkSize;
    private getChunkRealIndex;
    private readChunk;
    private isSizeUnknown;
    private isRead;
    _read(): void;
    private removeChunks;
    private getId;
    private getHeadChunkId;
    private getChunkId;
    private indexChunk;
    /**
     * Holds a reference to the last written chunk without actually writing it to ES.
     *
     * This enables us to reliably determine what the real last chunk is at the cost
     * of holding, at most, 2 full chunks in memory.
     */
    private indexRequestBuffer;
    private writeChunk;
    private finalizeLastChunk;
    private flush;
    private flushAllFullChunks;
    _write(chunk: Buffer | string, encoding: BufferEncoding, callback: Callback): void;
    _final(callback: Callback): void;
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
    getContentReferenceId(): undefined | string;
    getBytesWritten(): number;
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
export type WritableContentStream = Writable & Pick<ContentStream, 'getContentReferenceId' | 'getBytesWritten'>;
export declare function getWritableContentStream(args: ContentStreamArgs): WritableContentStream;
export type ReadableContentStream = Readable;
export declare function getReadableContentStream(args: Omit<ContentStreamArgs, 'id'> & {
    id: string;
}): ReadableContentStream;
export {};
