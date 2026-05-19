import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
/**
 * Represents the virtual version of a given SO type.
 * The virtual version is a compatibility format between the old
 * migration system's versioning, based on the stack version, and the new model versioning.
 *
 * A virtual version is a plain semver version. Depending on its major version value, the
 * underlying version can be the following:
 * - Major < 10: Old migrations system (stack versions), using the equivalent value (e.g `8.7.0` => migration version `8.7.0`)
 * - Major == 10: Model versions, using the `10.{modelVersion}.0` format (e.g `10.3.0` => model version 3)
 */
export type VirtualVersion = string;
/**
 * A map of SO type name to Model Version.
 */
export type ModelVersionMap = Record<string, number>;
/**
 * A map of SO type name to {@link VirtualVersion}.
 */
export type VirtualVersionMap = Record<string, VirtualVersion>;
/**
 * Returns the latest registered model version number for the given type.
 */
export declare const getLatestModelVersion: (type: SavedObjectsType) => number;
/**
 * Returns the latest registered migration version for the given type.
 * @param type the saved object from which we want to retrieve the latest migration version
 * @returns string the latest migration appearing in the migrations property, or 0.0.0 if no migrations defined.
 */
export declare const getLatestMigrationVersion: (type: SavedObjectsType) => string;
/**
 * Build a version map for the given types.
 */
export declare const getModelVersionMapForTypes: (types: SavedObjectsType[]) => ModelVersionMap;
/**
 * Returns the current virtual version for the given type.
 * It will either be:
 * - if the type defines model versions => the latest model version
 * - if the type does NOT define model versions =>
 *   - the initialModelVersion aka 10.0.0 (if useModelVersionsOnly is set to true)
 *   - the latest migration version for the type (if useModelVersionsOnly is set to false)
 */
export declare const getCurrentVirtualVersion: (type: SavedObjectsType, useModelVersionsOnly: boolean) => string;
export interface GetVirtualVersionMapParams {
    types: SavedObjectsType[];
    useModelVersionsOnly: boolean;
}
/**
 * Returns a map of virtual model version for the given types.
 * See {@link getCurrentVirtualVersion}
 */
export declare const getVirtualVersionMap: ({ types, useModelVersionsOnly, }: GetVirtualVersionMapParams) => VirtualVersionMap;
/**
 * Returns the latest version number that includes changes in the mappings, for the given type.
 * If none of the versions are updating the mappings, it will return 0
 */
export declare const getLatestMappingsVersionNumber: (type: SavedObjectsType) => number;
/**
 * Returns the latest model version that includes changes in the mappings, for the given type.
 * It will either be a model version or the latest migration version
 * if no changed were introduced after enforcing the switch to model versions.
 */
export declare const getLatestMappingsModelVersion: (type: SavedObjectsType) => string;
/**
 * Returns a map of virtual model version for the given types.
 * See {@link getLatestMappingsModelVersion}
 */
export declare const getLatestMappingsVirtualVersionMap: (types: SavedObjectsType[]) => VirtualVersionMap;
