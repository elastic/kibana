import type { SavedObjectsType, SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
import { type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
interface GenerateAdditiveMappingsDiffOpts {
    types: SavedObjectsType[];
    mapping: IndexMapping;
    deletedTypes: string[];
}
/**
 * Generates the additive mapping diff we will need to update the index mapping with.
 *
 * @param types The types to generate the diff for
 * @param meta The meta field of the index we're migrating
 * @param deletedTypes The list of deleted types to ignore during diff/comparison
 */
export declare const generateAdditiveMappingDiff: ({ types, mapping, deletedTypes, }: GenerateAdditiveMappingsDiffOpts) => SavedObjectsMappingProperties;
export {};
