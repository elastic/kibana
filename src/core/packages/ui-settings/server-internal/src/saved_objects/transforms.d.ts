import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { UpgradeableConfigAttributes } from '../create_or_upgrade_saved_config';
/**
 * The params needed to execute each transform function.
 */
interface TransformParams {
    savedObjectsClient: SavedObjectsClientContract;
    configAttributes: UpgradeableConfigAttributes | undefined;
}
/**
 * The resulting attributes that should be used when upgrading the config object.
 * This should be a union of all transform function return types (A | B | C | ...).
 */
type TransformReturnType = TransformDefaultIndexReturnType;
/**
 * The return type for `transformDefaultIndex`.
 * If this config object has already been upgraded, it returns `null` because it doesn't need to set different default attributes.
 * Otherwise, it always sets a default for the `isDefaultIndexMigrated` attribute, and it optionally sets the `defaultIndex` attribute
 * depending on the outcome.
 */
type TransformDefaultIndexReturnType = {
    isDefaultIndexMigrated: boolean;
    defaultIndex?: string;
} | null;
export type TransformConfigFn = (params: TransformParams) => Promise<TransformReturnType>;
/**
 * Any transforms that should be applied during `createOrUpgradeSavedConfig` need to be included in this array.
 */
export declare const transforms: TransformConfigFn[];
/**
 * This optionally transforms the `defaultIndex` attribute of a config saved object. The `defaultIndex` attribute points to a data view ID,
 * but those saved object IDs were regenerated in the 8.0 upgrade. That resulted in a bug where the `defaultIndex` would be broken in custom
 * spaces.
 *
 * We are fixing this bug after the fact in 8.3, and we can't retroactively change a saved object that's already been migrated, so we use
 * this transformation instead to ensure that the `defaultIndex` attribute is not broken.
 *
 * Note that what used to be called "index patterns" prior to 8.0 have been renamed to "data views", but the object type cannot be changed,
 * so that type remains `index-pattern`.
 *
 * Note also that this function is only exported for unit testing. It is also included in the `transforms` export above, which is how it is
 * applied during `createOrUpgradeSavedConfig`.
 */
export declare function transformDefaultIndex(params: TransformParams): Promise<TransformDefaultIndexReturnType>;
export {};
