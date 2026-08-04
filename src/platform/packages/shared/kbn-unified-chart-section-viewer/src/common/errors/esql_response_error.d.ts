import type { estypes } from '@elastic/elasticsearch';
export type EsqlResponseErrorCause = Partial<estypes.ErrorCause>;
/**
 * Builds a human-readable message from an Elasticsearch error cause, including
 * all `root_cause` entries (e.g. CCS / multi-cluster failures).
 */
export declare const formatErrorCause: (errorCause: EsqlResponseErrorCause) => string;
export interface EsqlEmbeddedError {
    readonly cause: EsqlResponseErrorCause;
    readonly status?: number;
}
/**
 * When Elasticsearch returns a body like `{ error: { type, reason }, status: 400 }`,
 * returns the error cause and optional status from the payload.
 */
export declare const extractEsqlEmbeddedError: (response: object) => EsqlEmbeddedError | undefined;
export declare class EsqlResponseError extends Error {
    readonly type?: string;
    readonly reason?: string;
    readonly rootCause?: EsqlResponseErrorCause[];
    readonly status?: number;
    constructor(errorCause: EsqlResponseErrorCause, options?: {
        status?: number;
    });
}
export declare const isEsqlResponseError: (error: unknown) => error is EsqlResponseError;
