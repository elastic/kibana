import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { type IndexMapping, type IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
interface BuildIndexMappingsOpts {
    types: SavedObjectsType[];
}
/**
 * Build the mappings to use when creating a new index.
 *
 * @param types The list of all registered SO types.
 */
export declare const buildIndexMappings: ({ types }: BuildIndexMappingsOpts) => IndexMapping;
interface BuildIndexMetaOpts {
    types: SavedObjectsType[];
}
/**
 * Build the mapping _meta field to use when creating a new index.
 *
 * @param types The list of all registered SO types.
 */
export declare const buildIndexMeta: ({ types }: BuildIndexMetaOpts) => IndexMappingMeta;
export {};
