/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaults } from 'lodash';

import type { Logger, LogMeta } from '@kbn/logging';
import { SavedObjectsClientContract } from '../../saved_objects/types';
import { SavedObjectsErrorHelpers } from '../../saved_objects';

import { getUpgradeableConfig } from './get_upgradeable_config';

interface ConfigLogMeta extends LogMeta {
  kibana: {
    config: { prevVersion: string; newVersion: string };
  };
}

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  version: string;
  buildNum: number;
  log: Logger;
  handleWriteErrors: boolean;
}

export async function createOrUpgradeSavedConfig(
  options: Options
): Promise<Record<string, any> | undefined> {
  const { savedObjectsClient, version, buildNum, log, handleWriteErrors } = options;

  // try to find an older config we can upgrade
  const upgradeableConfig = await getUpgradeableConfig({
    savedObjectsClient,
    version,
  });

  let defaultIndex: string | undefined;
  let isDefaultIndexMigrated = false;
  if (
    upgradeableConfig?.attributes.defaultIndex &&
    !upgradeableConfig.attributes.isDefaultIndexMigrated
  ) {
    defaultIndex = upgradeableConfig.attributes.defaultIndex; // Keep the existing defaultIndex attribute if the data view is not found
    try {
      // The defaultIndex for this config object was created prior to 8.3, and it might refer to a data view ID that is no longer valid.
      // We should try to resolve the data view and change the defaultIndex to the new ID, if necessary.
      const resolvedIndex = await savedObjectsClient.resolve('index-pattern', defaultIndex);
      if (resolvedIndex.outcome === 'aliasMatch' || resolvedIndex.outcome === 'conflict') {
        // This resolved to an aliasMatch or conflict outcome; that means we should change the defaultIndex to the data view's new ID.
        // Note, the alias_target_id field is guaranteed to exist iff the resolve outcome is aliasMatch or conflict.
        defaultIndex = resolvedIndex.alias_target_id!;
        isDefaultIndexMigrated = true;
      }
    } catch (err) {
      // If the defaultIndex is not found at all, it will throw a Not Found error and we should mark the defaultIndex attribute as upgraded.
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        isDefaultIndexMigrated = true;
      }
      // For any other error, leave it unchanged so we can try to upgrade this attribute again in the future.
    }
  }

  // default to the attributes of the upgradeableConfig if available
  const attributes = defaults(
    {
      buildNum,
      ...(isDefaultIndexMigrated && {
        // We migrated the defaultIndex attribute for this config, make sure these two fields take precedence over any in the old config
        defaultIndex,
        isDefaultIndexMigrated,
      }),
    },
    upgradeableConfig ?? {
      // We didn't find an upgradeable config, so this is a fresh one; mark the defaultIndex as migrated so we don't change it later!
      isDefaultIndexMigrated: true,
    }
  );

  try {
    // create the new SavedConfig
    await savedObjectsClient.create('config', attributes, { id: version });
  } catch (error) {
    if (handleWriteErrors) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        return;
      }

      if (
        SavedObjectsErrorHelpers.isNotAuthorizedError(error) ||
        SavedObjectsErrorHelpers.isForbiddenError(error)
      ) {
        return attributes;
      }
    }

    throw error;
  }

  if (upgradeableConfig) {
    log.debug<ConfigLogMeta>(`Upgrade config from ${upgradeableConfig.id} to ${version}`, {
      kibana: {
        config: {
          prevVersion: upgradeableConfig.id,
          newVersion: version,
        },
      },
    });
  }
}
