import type { TransformErrorObjects } from '../core';
import type { DocumentIdAndType } from '../actions';
/**
 * Constructs migration failure message strings from corrupt document ids and document transformation errors
 */
export declare function extractTransformFailuresReason(resolveMigrationFailuresUrl: string, corruptDocumentIds: string[], transformErrors: TransformErrorObjects[]): string;
export declare function extractDiscardedUnknownDocs(unknownDocs: DocumentIdAndType[]): string;
export declare function extractUnknownDocFailureReason(resolveMigrationFailuresUrl: string, unknownDocs: DocumentIdAndType[]): string;
export declare function extractDiscardedCorruptDocs(corruptDocumentIds: string[], transformErrors: TransformErrorObjects[]): string;
/**
 * Constructs migration failure message string for doc exceeds max batch size in bytes
 */
export declare const fatalReasonDocumentExceedsMaxBatchSizeBytes: ({ _id, docSizeBytes, maxBatchSizeBytes, }: {
    _id: string;
    docSizeBytes: number;
    maxBatchSizeBytes: number;
}) => string;
