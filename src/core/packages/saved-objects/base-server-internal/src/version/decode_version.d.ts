/**
 * Decode the "opaque" version string to the sequence params we
 * can use to activate optimistic concurrency in Elasticsearch
 */
export declare function decodeVersion(version?: string): {
    _seq_no: number;
    _primary_term: number;
};
