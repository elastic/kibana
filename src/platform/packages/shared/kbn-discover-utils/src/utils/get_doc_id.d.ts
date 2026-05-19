import type { EsHitRecord } from '../types';
/**
 * Returning a generated id of a given ES document, since `_id` can be the same
 * when using different indices and shard routing
 */
export declare const getDocId: (doc: EsHitRecord & {
    _routing?: string;
}) => string;
