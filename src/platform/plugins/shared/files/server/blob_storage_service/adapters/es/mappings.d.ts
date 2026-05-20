import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
/**
 * These are the fields we expect to find a given document acting as a file chunk.
 *
 * @note not all fields are used by this adapter but this represents the standard
 * shape for any consumers of BlobStorage in ES.
 */
export interface FileChunkDocument {
    /**
     * Data contents. Could be part of a file (chunk) or the entire file.
     */
    data: string;
    /**
     * Blob ID field that tags a set of blobs as belonging to the same file.
     */
    bid: string;
    /**
     * Whether this is the last chunk in a sequence.
     */
    last?: boolean;
}
export declare const mappings: MappingTypeMapping;
