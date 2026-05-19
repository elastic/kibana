import type { estypes } from '@elastic/elasticsearch';
import type { Payload } from '@hapi/boom';
import { type ISavedObjectTypeRegistry, type SavedObjectsRawDoc, type SavedObjectsRawDocSource, type SavedObject, type SavedObjectsRawDocParseOptions, type SavedObjectAccessControl } from '@kbn/core-saved-objects-server';
export interface GetBulkOperationErrorRawResponse {
    status: number;
    error: {
        type: string;
        reason?: string | null;
        index: string;
    };
}
/**
 * Checks the raw response of a bulk operation and returns an error if necessary.
 *
 * @param type
 * @param id
 * @param rawResponse
 *
 * @internal
 */
export declare function getBulkOperationError(type: string, id: string, rawResponse: GetBulkOperationErrorRawResponse): Payload | undefined;
/**
 * Returns an object with the expected version properties. This facilitates Elasticsearch's Optimistic Concurrency Control.
 *
 * @param version Optional version specified by the consumer.
 * @param document Optional existing document that was obtained in a preflight operation.
 *
 * @internal
 */
export declare function getExpectedVersionProperties(version?: string, document?: SavedObjectsRawDoc): {
    if_seq_no: number | undefined;
    if_primary_term: number | undefined;
} | {
    if_seq_no?: undefined;
    if_primary_term?: undefined;
};
/**
 * @internal
 */
export interface GetSavedObjectFromSourceOptions {
    /** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
    migrationVersionCompatibility?: SavedObjectsRawDocParseOptions['migrationVersionCompatibility'];
}
/**
 * Gets a saved object from a raw ES document.
 *
 * @param registry
 * @param type
 * @param id
 * @param doc
 *
 * @internal
 */
export declare function getSavedObjectFromSource<T>(registry: ISavedObjectTypeRegistry, type: string, id: string, doc: {
    _seq_no?: number;
    _primary_term?: number;
    _source: SavedObjectsRawDocSource;
}, { migrationVersionCompatibility }?: GetSavedObjectFromSourceOptions): SavedObject<T>;
/**
 * Check to ensure that a raw document exists in a namespace. If the document is not a multi-namespace type, then this returns `true` as
 * we rely on the guarantees of the document ID format. If the document is a multi-namespace type, this checks to ensure that the
 * document's `namespaces` value includes the string representation of the given namespace.
 *
 * WARNING: This should only be used for documents that were retrieved from Elasticsearch. Otherwise, the guarantees of the document ID
 * format mentioned above do not apply.
 *
 * @param registry
 * @param raw
 * @param namespace
 *
 * @internal
 */
export declare function rawDocExistsInNamespace(registry: ISavedObjectTypeRegistry, raw: SavedObjectsRawDoc, namespace: string | undefined): boolean;
/**
 * Check to ensure that a raw document exists in at least one of the given namespaces. If the document is not a multi-namespace type, then
 * this returns `true` as we rely on the guarantees of the document ID format. If the document is a multi-namespace type, this checks to
 * ensure that the document's `namespaces` value includes the string representation of at least one of the given namespaces.
 *
 * WARNING: This should only be used for documents that were retrieved from Elasticsearch. Otherwise, the guarantees of the document ID
 * format mentioned above do not apply.
 *
 * @param registry
 * @param raw
 * @param namespaces
 *
 * @internal
 */
export declare function rawDocExistsInNamespaces(registry: ISavedObjectTypeRegistry, raw: SavedObjectsRawDoc, namespaces: string[]): boolean;
/**
 * Ensure that a namespace is always in its namespace ID representation.
 * This allows `'default'` to be used interchangeably with `undefined`.
 *
 * @param namespace
 *
 * @internal
 */
export declare function normalizeNamespace(namespace?: string): string | undefined;
/**
 * Returns the current time. For use in Elasticsearch operations.
 *
 * @internal
 */
export declare function getCurrentTime(): string;
/**
 * Returns the managed boolean to apply to a document as it's managed value.
 * For use by applications to modify behavior for managed saved objects.
 * The behavior is as follows:
 * If `optionsManaged` is set, it will override any existing `managed` value in all the documents being created
 * If `optionsManaged` is not provided, then the documents are created with whatever may be assigned to their `managed` property
 * or default to `false`.
 *
 * @internal
 */
export declare function setManaged({ optionsManaged, objectManaged, }: {
    optionsManaged?: boolean;
    objectManaged?: boolean;
}): boolean;
/**
 * Returns a string array of namespaces for a given saved object. If the saved object is undefined, the result is an array that contains the
 * current namespace. Value may be undefined if an existing saved object has no namespaces attribute; this should not happen in normal
 * operations, but it is possible if the Elasticsearch document is manually modified.
 *
 * @param namespace The current namespace.
 * @param document Optional existing saved object that was obtained in a preflight operation.
 */
export declare function getSavedObjectNamespaces(namespace?: string, document?: SavedObjectsRawDoc): string[] | undefined;
export declare function isMgetDoc(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.GetGetResult;
export declare function isMgetError(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.MgetMultiGetError;
export declare function setAccessControl({ typeSupportsAccessControl, createdBy, accessMode, }: {
    typeSupportsAccessControl: boolean;
    createdBy?: string;
    accessMode?: SavedObjectAccessControl['accessMode'];
}): {
    owner: string;
    accessMode: "default" | "write_restricted";
} | undefined;
