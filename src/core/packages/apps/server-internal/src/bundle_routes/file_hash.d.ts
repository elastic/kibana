import type { Stats } from 'fs';
import type { IFileHashCache } from './file_hash_cache';
/**
 *  Get the hash of a file via a file descriptor
 */
export declare function getFileHash(cache: IFileHashCache, path: string, stat: Stats, fd: number): Promise<string>;
