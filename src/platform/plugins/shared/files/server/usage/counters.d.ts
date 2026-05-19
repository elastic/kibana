export declare function getCounters(fileKind: string): {
    DELETE: string;
    DELETE_ERROR: string;
    DELETE_ERROR_NOT_FOUND: string;
    SHARE: string;
    SHARE_ERROR: string;
    SHARE_ERROR_EXPIRATION_IN_PAST: string;
    SHARE_ERROR_FORBIDDEN: string;
    SHARE_ERROR_CONFLICT: string;
    UNSHARE: string;
    UNSHARE_ERROR: string;
    UNSHARE_ERROR_NOT_FOUND: string;
    DOWNLOAD: string;
    DOWNLOAD_ERROR: string;
    UPLOAD_ERROR_ABORT: string;
};
export type Counters = keyof ReturnType<typeof getCounters>;
