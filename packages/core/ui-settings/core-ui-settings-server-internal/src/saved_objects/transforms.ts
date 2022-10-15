/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-utils-server';
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
export const transforms: TransformConfigFn[] = [transformDefaultIndex];

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
export async function transformDefaultIndex(
  params: TransformParams
): Promise<TransformDefaultIndexReturnType> {
  const { savedObjectsClient, configAttributes } = params;
  if (configAttributes?.isDefaultIndexMigrated) {
    // This config object has already been migrated, return null because we don't need to set different defaults for the new config object.
    return null;
  }
  if (!configAttributes?.defaultIndex) {
    // If configAttributes is undefined (there's no config object being upgraded), OR if configAttributes is defined but the defaultIndex
    // attribute is not set, set isDefaultIndexMigrated to true and return. This means there was no defaultIndex to upgrade, so we will just
    // avoid attempting to transform this again in the future.
    return { isDefaultIndexMigrated: true };
  }

  let defaultIndex = configAttributes.defaultIndex; // Retain the existing defaultIndex attribute in case we run into a resolve error
  let isDefaultIndexMigrated: boolean;
  try {
    // The defaultIndex for this config object was created prior to 8.3, and it might refer to a data view ID that is no longer valid.
    // We should try to resolve the data view and change the defaultIndex to the new ID, if necessary.
    const resolvedDataView = await savedObjectsClient.resolve('index-pattern', defaultIndex);
    if (resolvedDataView.outcome === 'aliasMatch' || resolvedDataView.outcome === 'conflict') {
      // This resolved to an aliasMatch or conflict outcome; that means we should change the defaultIndex to the data view's new ID.
      // Note, the alias_target_id field is guaranteed to exist iff the resolve outcome is aliasMatch or conflict.
      defaultIndex = resolvedDataView.alias_target_id!;
    }
    isDefaultIndexMigrated = true; // Regardless of the resolve outcome, we now consider this defaultIndex attribute to be migrated
  } catch (err) {
    // If the defaultIndex is not found at all, it will throw a Not Found error and we should mark the defaultIndex attribute as upgraded.
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      isDefaultIndexMigrated = true;
    } else {
      // For any other error, explicitly set isDefaultIndexMigrated to false so we can try this upgrade again in the future.
      isDefaultIndexMigrated = false;
    }
  }
  return { isDefaultIndexMigrated, defaultIndex };
}
