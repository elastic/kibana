import type { AggTypesRegistryStart } from '../agg_types_registry';
import type { AggTypesDependencies } from '../agg_types';
/** @internal */
export declare function mockGetFieldFormatsStart(): {
    deserialize: import("../../../../../field_formats/common").FormatFactory;
    getDefaultInstance: (fieldType: import("@kbn/field-types").KBN_FIELD_TYPES, esTypes?: import("@kbn/field-types").ES_FIELD_TYPES[], params?: import("../../../../../field_formats/common").FieldFormatParams) => import("../../../../../field_formats/common").FieldFormat;
};
/** @internal */
export declare const mockAggTypesDependencies: AggTypesDependencies;
/**
 * Testing utility which creates a new instance of AggTypesRegistry,
 * registers the provided agg types, and returns AggTypesRegistry.start()
 *
 * This is useful if your test depends on a certain agg type to be present
 * in the registry.
 *
 * @param [types] - Optional array of AggTypes to register.
 * If no value is provided, all default types will be registered.
 *
 * @internal
 */
export declare function mockAggTypesRegistry(deps?: AggTypesDependencies): AggTypesRegistryStart;
