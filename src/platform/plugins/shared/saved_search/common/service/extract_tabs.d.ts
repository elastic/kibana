import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import type { SCHEMA_SEARCH_MODEL_VERSION_5, SCHEMA_SEARCH_MODEL_VERSION_6 } from '../../server/saved_objects/schema';
export declare const extractTabsBackfillFn: SavedObjectModelDataBackfillFn<TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5>, TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_6>>;
/**
 * Extract tab attributes into a separate array since multiple tabs are supported
 * @param attributes The previous attributes to be transformed (version 5)
 * @param discoverSessionId Optional Discover session ID used to generate a deterministic UUID for the default tab
 */
export declare function extractTabs<T extends TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5>>(attributes: T, discoverSessionId?: string): T & {
    tabs: {
        id: string;
        label: string;
        attributes: Pick<Omit<T, "description" | "title">, Exclude<Exclude<keyof T, "description" | "title">, "tabs">>;
    }[];
};
