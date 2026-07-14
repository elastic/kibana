import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ISavedObjectTypeRegistry, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import { type SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import type { RepositoryEsClient } from '../../repository_es_client';
import type { PreflightCheckForBulkDeleteParams } from '../internals/repository_bulk_delete_internal_types';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
import { type GetResponseFound } from '../utils';
import { type PreflightCheckForCreateObject } from '../internals/preflight_check_for_create';
export type IPreflightCheckHelper = PublicMethodsOf<PreflightCheckHelper>;
export declare class PreflightCheckHelper {
    private registry;
    private serializer;
    private client;
    private getIndexForType;
    private createPointInTimeFinder;
    constructor({ registry, serializer, client, getIndexForType, createPointInTimeFinder, }: {
        registry: ISavedObjectTypeRegistry;
        serializer: ISavedObjectsSerializer;
        client: RepositoryEsClient;
        getIndexForType: (type: string) => string;
        createPointInTimeFinder: CreatePointInTimeFinderFn;
    });
    preflightCheckForCreate(objects: PreflightCheckForCreateObject[]): Promise<import("../internals/preflight_check_for_create").PreflightCheckForCreateResult[]>;
    /**
     * Fetch multi-namespace saved objects
     * @returns MgetResponse
     * @notes multi-namespace objects shared to more than one space require special handling. We fetch these docs to retrieve their namespaces.
     * @internal
     */
    preflightCheckForBulkDelete(params: PreflightCheckForBulkDeleteParams): Promise<import("@elastic/elasticsearch").TransportResult<import("@elastic/elasticsearch/lib/api/types").MgetResponse<SavedObjectsRawDocSource>, unknown> | undefined>;
    /**
     * Pre-flight check to ensure that a multi-namespace object exists in the current namespace.
     */
    preflightCheckNamespaces({ type, id, namespace, initialNamespaces, }: PreflightCheckNamespacesParams): Promise<PreflightCheckNamespacesResult>;
    /**
     * Pre-flight check fetching the document regardless of its namespace type for update.
     */
    preflightGetDocForUpdate({ type, id, namespace, }: PreflightDocParams): Promise<PreflightDocResult>;
    /**
     * Pre-flight check to ensure that a multi-namespace object exists in the current namespace for update API.
     */
    preflightCheckNamespacesForUpdate({ type, namespace, initialNamespaces, preflightDocResult, }: PreflightNSParams): PreflightNSResult;
    /**
     * Pre-flight check to ensure that an upsert which would create a new object does not result in an alias conflict.
     *
     * If an upsert would result in the creation of a new object, we need to check for alias conflicts too.
     * This takes an extra round trip to Elasticsearch, but this won't happen often.
     */
    preflightCheckForUpsertAliasConflict(type: string, id: string, namespace: string | undefined): Promise<void>;
}
/**
 * @internal
 */
export interface PreflightCheckNamespacesParams {
    /** The object type to fetch */
    type: string;
    /** The object ID to fetch */
    id: string;
    /** The current space */
    namespace: string | undefined;
    /** Optional; for an object that is being created, this specifies the initial namespace(s) it will exist in (overriding the current space) */
    initialNamespaces?: string[];
}
/**
 * @internal
 */
export interface PreflightNSParams {
    /** The object type to fetch */
    type: string;
    /** The object ID to fetch */
    id: string;
    /** The current space */
    namespace: string | undefined;
    /** Optional; for an object that is being created, this specifies the initial namespace(s) it will exist in (overriding the current space) */
    initialNamespaces?: string[];
    /** Optional; for a pre-fetched object */
    preflightDocResult: PreflightDocResult;
}
/**
 * @internal
 */
export interface PreflightNSResult {
    /** If the object exists, and whether or not it exists in the current space */
    checkResult?: 'not_found' | 'found_in_namespace' | 'found_outside_namespace';
    /**
     * What namespace(s) the object should exist in, if it needs to be created; practically speaking, this will never be undefined if
     * checkResult == not_found or checkResult == found_in_namespace
     */
    savedObjectNamespaces?: string[];
    /** The source of the raw document, if the object already exists */
    rawDocSource?: GetResponseFound<SavedObjectsRawDocSource>;
    /** Indicates if the namespaces check is called or not. Non-multinamespace types are not shareable */
    checkSkipped?: boolean;
}
/**
 * @internal
 */
export interface PreflightCheckNamespacesResult {
    /** If the object exists, and whether or not it exists in the current space */
    checkResult: 'not_found' | 'found_in_namespace' | 'found_outside_namespace';
    /**
     * What namespace(s) the object should exist in, if it needs to be created; practically speaking, this will never be undefined if
     * checkResult == not_found or checkResult == found_in_namespace
     */
    savedObjectNamespaces?: string[];
    /** The source of the raw document, if the object already exists */
    rawDocSource?: GetResponseFound<SavedObjectsRawDocSource>;
}
/**
 * @internal
 */
export interface PreflightDocParams {
    /** The object type to fetch */
    type: string;
    /** The object ID to fetch */
    id: string;
    /** The current space */
    namespace: string | undefined;
    /**
     * optional migration version compatibility.
     * {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility}
     */
    migrationVersionCompatibility?: 'compatible' | 'raw';
}
/**
 * @internal
 */
export interface PreflightDocResult {
    /** If the object exists, and whether or not it exists in the current space */
    checkDocFound: 'not_found' | 'found';
    /** The source of the raw document, if the object already exists in the server's version (unsafe to use) */
    rawDocSource?: GetResponseFound<SavedObjectsRawDocSource>;
}
