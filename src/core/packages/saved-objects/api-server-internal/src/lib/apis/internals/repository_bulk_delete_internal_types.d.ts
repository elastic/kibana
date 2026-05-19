import type { Payload } from '@hapi/boom';
import type { BulkOperationBase, BulkResponseItem, ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { estypes, TransportResult } from '@elastic/elasticsearch';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-server';
import type { Either } from '@kbn/core-saved-objects-api-server';
import type { DeleteLegacyUrlAliasesParams } from './delete_legacy_url_aliases';
/**
 * @internal
 */
export interface PreflightCheckForBulkDeleteParams {
    expectedBulkGetResults: BulkDeleteExpectedBulkGetResult[];
    namespace?: string;
}
/**
 * @internal
 */
export interface ExpectedBulkDeleteMultiNamespaceDocsParams {
    expectedBulkGetResults: BulkDeleteExpectedBulkGetResult[];
    multiNamespaceDocsResponse: TransportResult<estypes.MgetResponse<unknown>, unknown> | undefined;
    namespace: string | undefined;
    force?: boolean;
}
/**
 * @internal
 */
export interface BulkDeleteParams {
    delete: Omit<BulkOperationBase, 'version' | 'version_type' | 'routing'>;
}
/**
 * @internal
 */
export type ExpectedBulkDeleteResult = Either<{
    type: string;
    id: string;
    error: Payload;
    accessControl?: SavedObjectAccessControl;
}, {
    type: string;
    id: string;
    namespaces: string[];
    esRequestIndex: number;
    accessControl?: SavedObjectAccessControl;
}>;
/**
 * @internal
 */
export interface BulkDeleteItemErrorResult {
    success: boolean;
    type: string;
    id: string;
    error: Payload;
}
/**
 * @internal
 */
export type NewBulkItemResponse = BulkResponseItem & {
    error: ErrorCause & {
        index: string;
    };
};
/**
 * @internal
 * @note Contains all documents for bulk delete, regardless of namespace type
 */
export type BulkDeleteExpectedBulkGetResult = Either<{
    type: string;
    id: string;
    error: Payload;
}, {
    type: string;
    id: string;
    version?: string;
    esRequestIndex?: number;
    fields?: string[];
    accessControl?: SavedObjectAccessControl;
}>;
export type ObjectToDeleteAliasesFor = Pick<DeleteLegacyUrlAliasesParams, 'type' | 'id' | 'namespaces' | 'deleteBehavior'>;
