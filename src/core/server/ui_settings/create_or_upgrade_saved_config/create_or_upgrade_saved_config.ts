/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaults } from 'lodash';

import { SavedObjectsClientContract } from '../../saved_objects/types';
import { SavedObjectsErrorHelpers } from '../../saved_objects';
import { Logger, LogMeta } from '../../logging';

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

  // default to the attributes of the upgradeableConfig if available
  const attributes = defaults(
    { buildNum },
    upgradeableConfig ? (upgradeableConfig.attributes as any) : {}
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
