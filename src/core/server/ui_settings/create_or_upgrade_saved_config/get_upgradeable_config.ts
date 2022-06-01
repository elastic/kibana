/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '../../saved_objects/types';
import { isConfigVersionUpgradeable } from './is_config_version_upgradeable';

/**
 * This contains a subset of `config` object attributes that are relevant for upgrading it.
 */
export interface UpgradeableConfigType {
  buildNum: string;
  defaultIndex: string | undefined;
  isDefaultIndexMigrated: boolean | undefined;
}

/**
 *  Find the most recent SavedConfig that is upgradeable to the specified version
 *  @param {Object} options
 *  @property {SavedObjectsClient} savedObjectsClient
 *  @property {string} version
 *  @return {Promise<SavedConfig|undefined>}
 */
export async function getUpgradeableConfig({
  savedObjectsClient,
  version,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  version: string;
}) {
  // attempt to find a config we can upgrade
  const { saved_objects: savedConfigs } = await savedObjectsClient.find<UpgradeableConfigType>({
    type: 'config',
    page: 1,
    perPage: 1000,
    fields: ['buildNum', 'defaultIndex', 'isDefaultIndexMigrated'], // Optimization: we only need these type-level fields, don't return anything else
    sortField: 'buildNum',
    sortOrder: 'desc',
  });

  // try to find a config that we can upgrade
  return savedConfigs.find((savedConfig) => isConfigVersionUpgradeable(savedConfig.id, version));
}
