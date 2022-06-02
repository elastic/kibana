/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers } from '../../saved_objects';
import type { SavedObjectsClientContract } from '../../types';
import type { UpgradeableConfigType } from '../create_or_upgrade_saved_config';

interface Params {
  savedObjectsClient: SavedObjectsClientContract;
  configAttributes:
    | Pick<UpgradeableConfigType, 'defaultIndex' | 'isDefaultIndexMigrated'>
    | undefined;
}

/** The resulting parameters that should be used when upgrading the config object. */
interface ReturnType {
  isDefaultIndexMigrated: boolean;
  defaultIndex?: string;
}

/**
 * This is applied during `createOrUpgradeSavedConfig` to optionally transform the `defaultIndex` attribute of a config saved object. The
 * `defaultIndex` attribute points to a data view ID, but those saved object IDs were regenerated in the 8.0 upgrade. That resulted in a bug
 * where the `defaultIndex` would be broken in custom spaces.
 *
 * We are fixing this bug after the fact, and we can't retroactively change a saved object that's already been migrated, so we use this
 * transformation instead to ensure that the `defaultIndex` attributeis not broken.
 *
 * Note that what used to be called "index patterns" prior to 8.0 have been renamed to "data views", but the object type cannot be changed,
 * so that type remains `index-pattern`.
 */
export async function transformDefaultIndex(params: Params): Promise<ReturnType> {
  const { savedObjectsClient, configAttributes } = params;
  if (!configAttributes || !configAttributes.defaultIndex) {
    // If configAttributes is undefined (there's no config object being upgraded), set isDefaultIndexMigrated to true and return.
    // If configAttributes is defined but the defaultIndex attribute is not set, set isDefaultIndexMigrated to true and return.
    return { isDefaultIndexMigrated: true };
  }

  let defaultIndex = configAttributes.defaultIndex!; // Retain the existing defaultIndex attribute in case we run into a resolve error
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
