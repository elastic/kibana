import type { SavedObjectModelDataBackfillFn, SavedObjectModelUnsafeTransformFn } from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import type { SCHEMA_SEARCH_MODEL_VERSION_12_SO_API_WORKAROUND, SCHEMA_SEARCH_MODEL_VERSION_5, SCHEMA_SEARCH_MODEL_VERSION_6 } from '../../server/saved_objects/schema_legacy';
import type { SCHEMA_DISCOVER_SESSION_V13 } from '../../server/saved_objects/schema';
export declare const extractTabsBackfillFnV6: SavedObjectModelDataBackfillFn<TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5>, TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_6>>;
export declare const extractTabsTransformFnV13: SavedObjectModelUnsafeTransformFn<TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_12_SO_API_WORKAROUND>, TypeOf<typeof SCHEMA_DISCOVER_SESSION_V13>>;
/**
 * Extract tab attributes into a separate array since multiple tabs are supported
 * @param attributes The previous attributes to be transformed
 * @param discoverSessionId Optional Discover session ID used to generate a deterministic UUID for the default tab
 */
export declare function extractTabs<T extends TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5> | TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_12_SO_API_WORKAROUND>>(attributes: T, discoverSessionId?: string): T & {
    tabs: {
        id: string;
        label: string;
        attributes: Pick<Omit<T, "description" | "title" | "version" | "hits">, Exclude<Exclude<keyof T, "description" | "title" | "version" | "hits">, "tabs">>;
    }[];
};
