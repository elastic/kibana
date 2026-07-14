export declare const MAX_HTTP_LINE_CHUNK_SIZE: number;
/**
 * Creates chunks from a list of strings, where each chunk contains as many items
 * as possible without exceeding the specified chunk size limit.
 */
export declare const bytePartition: (list: string[], chunkSize?: number) => string[][];
