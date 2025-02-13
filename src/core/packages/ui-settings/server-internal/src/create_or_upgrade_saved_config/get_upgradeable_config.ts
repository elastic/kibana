/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Semver from 'semver';
import type {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type { ConfigAttributes } from '../saved_objects';
import { isConfigVersionUpgradeable } from './is_config_version_upgradeable';

/**
 * This contains a subset of `config` object attributes that are relevant for upgrading it using transform functions.
 * It is a superset of all the attributes needed for all of the transform functions defined in `transforms.ts`.
 */
export interface UpgradeableConfigAttributes extends ConfigAttributes {
  defaultIndex?: string;
  isDefaultIndexMigrated?: boolean;
}

/**
 *  Find the most recent SavedConfig that is upgradeable to the specified version
 *  @param {Object} options
 *  @property {SavedObjectsClient} savedObjectsClient
 *  @property {string} version
 *  @property {type} `config` or `config-global`
 *  @return {Promise<SavedConfig|undefined>}
 */
export async function getUpgradeableConfig({
  savedObjectsClient,
  version,
  type,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  version: string;
  type: 'config' | 'config-global' | 'config-user';
}) {
  // attempt to find a config we can upgrade
  const { saved_objects: savedConfigs } =
    await savedObjectsClient.find<UpgradeableConfigAttributes>({
      type,
      page: 1,
      perPage: 1000,
      sortField: 'buildNum',
      sortOrder: 'desc',
    });

  // try to find a config that we can upgrade
  const matchingResults = savedConfigs.filter((savedConfig) =>
    isConfigVersionUpgradeable(savedConfig.id, version)
  );
  const mostRecentConfig = getMostRecentConfig(matchingResults);
  if (mostRecentConfig) {
    return { id: mostRecentConfig.id, attributes: mostRecentConfig.attributes };
  }
  return null;
}

const getMostRecentConfig = (
  results: Array<SavedObjectsFindResult<UpgradeableConfigAttributes>>
): SavedObjectsFindResult<UpgradeableConfigAttributes> | undefined => {
  return results.reduce<SavedObjectsFindResult<UpgradeableConfigAttributes> | undefined>(
    (mostRecent, current) => {
      if (!mostRecent) {
        return current;
      }
      return Semver.gt(mostRecent.id, current.id) ? mostRecent : current;
    },
    undefined
  );
};
