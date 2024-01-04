/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaults } from 'lodash';

import type { Logger, LogMeta } from '@kbn/logging';
import { asyncForEach } from '@kbn/std';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import { getUpgradeableConfig } from './get_upgradeable_config';
import { transforms } from '../saved_objects';

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
  type: 'config' | 'config-global';
}

export async function createOrUpgradeSavedConfig(
  options: Options
): Promise<Record<string, any> | undefined> {
  const { savedObjectsClient, version, buildNum, log, handleWriteErrors, type } = options;

  // try to find an older config we can upgrade
  const upgradeableConfig = await getUpgradeableConfig({
    savedObjectsClient,
    version,
    type,
  });

  let transformDefaults = {};
  await asyncForEach(transforms, async (transformFn) => {
    const result = await transformFn({
      savedObjectsClient,
      configAttributes: upgradeableConfig?.attributes,
    });
    transformDefaults = { ...transformDefaults, ...result };
  });

  // default to the attributes of the upgradeableConfig if available
  const attributes = defaults(
    {
      buildNum,
      ...transformDefaults, // Any defaults that should be applied from transforms
    },
    upgradeableConfig?.attributes
  );

  try {
    // create the new SavedConfig
    await savedObjectsClient.create(type, attributes, { id: version, refresh: false });
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
