/**
 * Helper for decoding version to request params that are driven
 * by the version info
 */
export declare function decodeRequestVersion(version?: string): {
    if_seq_no: number;
    if_primary_term: number;
};
