import { type ISavedObjectTypeRegistry, type ISavedObjectsSerializer, type SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
import type { RepositoryEsClient } from '../../repository_es_client';
/**
 * How many aliases to search for per page. This is 1000 because consumers are relatively important operations and we could potentially be
 * paging through many thousands of results.
 *
 * @internal
 */
export declare const ALIAS_SEARCH_PER_PAGE = 1000;
export interface PreflightCheckForCreateObject {
    /** The type of the object. */
    type: string;
    /** The ID of the object. */
    id: string;
    /** The namespaces that the consumer intends to create this object in. */
    namespaces: string[];
    /** Whether or not the object should be overwritten if it would encounter a regular conflict. */
    overwrite?: boolean;
}
export interface PreflightCheckForCreateParams {
    registry: ISavedObjectTypeRegistry;
    client: RepositoryEsClient;
    serializer: ISavedObjectsSerializer;
    getIndexForType: (type: string) => string;
    createPointInTimeFinder: CreatePointInTimeFinderFn;
    objects: PreflightCheckForCreateObject[];
}
export interface PreflightCheckForCreateResult {
    /** The type of the object. */
    type: string;
    /** The ID of the object. */
    id: string;
    /** Only included if we did not encounter an error _and_ the object was found. */
    existingDocument?: SavedObjectsRawDoc;
    /** Only included if we encountered an error. */
    error?: {
        type: 'aliasConflict' | 'unresolvableConflict' | 'conflict';
        metadata?: {
            spacesWithConflictingAliases?: string[];
            isNotOverwritable?: boolean;
        };
    };
}
/**
 * Conducts pre-flight checks before object creation. Consumers should only check eligible objects (multi-namespace types).
 * For each object that the consumer intends to create, we check for three potential error cases in all applicable spaces:
 *
 *  1. 'aliasConflict' - there is already an alias that points to a different object.
 *  2. 'unresolvableConflict' - this object already exists in a different space and it cannot be overwritten with the given parameters.
 *  3. 'conflict' - this object already exists (and the given options include `overwrite=false`).
 *
 * Objects can be created in 1-N spaces, and for each object+space combination we need to check if a legacy URL alias exists. This function
 * attempts to optimize by defining an "alias threshold"; if we need to check for more aliases than that threshold, instead of attempting to
 * bulk-get each one, we find (search for) them. This is intended to strike an acceptable balance of performance, and is necessary when
 * creating objects in "*" (all current and future spaces) because we don't want to attempt to enumerate all spaces here.
 *
 * @param objects The objects that the consumer intends to create.
 *
 * @internal
 */
export declare function preflightCheckForCreate(params: PreflightCheckForCreateParams): Promise<PreflightCheckForCreateResult[]>;
