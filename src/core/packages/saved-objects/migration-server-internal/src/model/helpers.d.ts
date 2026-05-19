import type { BulkOperationContainer, QueryDslBoolQuery, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import * as Either from 'fp-ts/Either';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { AliasAction, FetchIndexResponse } from '../actions';
import type { BulkIndexOperationTuple } from './create_batches';
import type { BaseState, CleanupUnknownAndExcluded, CleanupUnknownAndExcludedWaitForTaskState, OutdatedDocumentsSearchRead, ReindexSourceToTempRead } from '../state';
/** @internal */
export declare const REINDEX_TEMP_SUFFIX = "_reindex_temp";
/** @internal */
export type Aliases = Partial<Record<string, string>>;
/**
 * A helper function/type for ensuring that all control state's are handled.
 */
export declare function throwBadControlState(p: never): never;
/**
 * A helper function/type for ensuring that all response types are handled.
 */
export declare function throwBadResponse(state: {
    controlState: string;
}, p: never): never;
/**
 * A helper function used by CLEANUP_UNKNOWN_AND_EXCLUDED and CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK
 * to pass some needed properties to PREPARE_COMPATIBLE_MIGRATION
 */
export declare function getPrepareCompatibleMigrationStateProperties(state: CleanupUnknownAndExcluded | CleanupUnknownAndExcludedWaitForTaskState): {
    targetIndexMappings: {
        _meta: {
            migrationMappingPropertyHashes?: {
                [k: string]: string;
            };
            mappingVersions?: import("@kbn/core-saved-objects-base-server-internal").VirtualVersionMap;
            indexTypesMap?: import("@kbn/core-saved-objects-base-server-internal").IndexTypesMap;
            docVersions?: import("@kbn/core-saved-objects-base-server-internal").VirtualVersionMap;
            migrationState?: import("@kbn/core-saved-objects-base-server-internal").IndexMappingMigrationStateMeta;
        };
        dynamic?: false | "false" | "strict";
        properties: import("@kbn/core-saved-objects-server").SavedObjectsMappingProperties;
    };
    preTransformDocsActions: AliasAction[];
};
/**
 * Merge the mappings._meta information of an index with the given target mappings.
 *
 * @remarks When another instance already completed a migration, the existing
 * target index might contain documents and mappings created by a plugin that
 * is disabled in the current Kibana instance performing this migration.
 * Mapping updates are commutative (deeply merged) by Elasticsearch, except
 * for the `_meta` key. By merging the `_meta` from the existing target index
 * into the targetMappings we ensure that any versions for disabled plugins aren't lost.
 *
 * @param targetMappings
 * @param indexMappings
 */
export declare function mergeMappingMeta(targetMappings: IndexMapping, indexMappings: IndexMapping): {
    _meta: {
        migrationMappingPropertyHashes?: {
            [k: string]: string;
        };
        mappingVersions?: import("@kbn/core-saved-objects-base-server-internal").VirtualVersionMap;
        indexTypesMap?: import("@kbn/core-saved-objects-base-server-internal").IndexTypesMap;
        docVersions?: import("@kbn/core-saved-objects-base-server-internal").VirtualVersionMap;
        migrationState?: import("@kbn/core-saved-objects-base-server-internal").IndexMappingMigrationStateMeta;
    };
    dynamic?: false | "false" | "strict";
    properties: import("@kbn/core-saved-objects-server").SavedObjectsMappingProperties;
};
/**
 * If `.kibana` and the version specific aliases both exists and
 * are pointing to the same index. This version's migration has already
 * been completed.
 */
export declare function versionMigrationCompleted(currentAlias: string, versionAlias: string, aliases: Aliases): boolean;
export declare function indexBelongsToLaterVersion(kibanaVersion: string, indexName?: string): boolean;
export declare function hasLaterVersionAlias(kibanaVersion: string, aliases?: Partial<Record<string, string>>): string | undefined;
/**
 * Add new must_not clauses to the given query
 * in order to filter out the specified types
 * @param boolQuery the bool query to be enriched
 * @param types the types to be filtered out
 * @returns a new query container with the enriched query
 */
export declare function addExcludedTypesToBoolQuery(types: string[], boolQuery?: QueryDslBoolQuery): QueryDslQueryContainer;
/**
 * Add the given clauses to the 'must' of the given query
 * @param filterClauses the clauses to be added to a 'must'
 * @param boolQuery the bool query to be enriched
 * @returns a new query container with the enriched query
 */
export declare function addMustClausesToBoolQuery(filterClauses: QueryDslQueryContainer[], boolQuery?: QueryDslBoolQuery): QueryDslQueryContainer;
/**
 * Add the given clauses to the 'must_not' of the given query
 * @param filterClauses the clauses to be added to a 'must_not'
 * @param boolQuery the bool query to be enriched
 * @returns a new query container with the enriched query
 */
export declare function addMustNotClausesToBoolQuery(filterClauses: QueryDslQueryContainer[], boolQuery?: QueryDslBoolQuery): QueryDslQueryContainer;
/**
 * Extracts the version number from a >= 7.11 index
 * @param indexName A >= v7.11 index name
 */
export declare function indexVersion(indexName?: string): string | undefined;
/**
 * Extracts the version number from a >= 7.11 index alias
 * @param indexName A >= v7.11 index alias
 */
export declare function aliasVersion(alias?: string): string | undefined;
/** @internal */
export interface MultipleIndicesPerAlias {
    type: 'multiple_indices_per_alias';
    alias: string;
    indices: string[];
}
/**
 * Creates a record of alias -> index name pairs
 */
export declare function getAliases(indices: FetchIndexResponse): Either.Either<MultipleIndicesPerAlias, Aliases>;
/**
 * Build a list of alias actions to remove the provided aliases from the given index.
 */
export declare function buildRemoveAliasActions(index: string, aliases: string[], exclude: string[]): AliasAction[];
/**
 * Given a document, creates a valid body to index the document using the Bulk API.
 */
export declare const createBulkIndexOperationTuple: (doc: SavedObjectsRawDoc, typeIndexMap?: Record<string, string>) => BulkIndexOperationTuple;
/**
 * Given a document id, creates a valid body to delete the document using the Bulk API.
 */
export declare const createBulkDeleteOperationBody: (_id: string) => BulkOperationContainer;
/** @internal */
export declare enum MigrationType {
    Compatible = "compatible",
    Incompatible = "incompatible",
    Unnecessary = "unnecessary",
    Invalid = "invalid"
}
interface MigrationTypeParams {
    isMappingsCompatible: boolean;
    isVersionMigrationCompleted: boolean;
}
export declare function getMigrationType({ isMappingsCompatible, isVersionMigrationCompleted, }: MigrationTypeParams): MigrationType;
/**
 * Generate a temporary index name, to reindex documents into it
 * @param index The name of the SO index
 * @param kibanaVersion The current kibana version
 * @returns A temporary index name to reindex documents
 */
export declare const getTempIndexName: (indexPrefix: string, kibanaVersion: string) => string;
/** Increase batchSize by 20% until a maximum of maxBatchSize */
export declare const increaseBatchSize: (stateP: OutdatedDocumentsSearchRead | ReindexSourceToTempRead) => number;
export declare const getIndexTypes: (state: BaseState) => string[];
export {};
