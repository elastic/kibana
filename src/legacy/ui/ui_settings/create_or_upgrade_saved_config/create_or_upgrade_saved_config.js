/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defaults } from 'lodash';

import { getUpgradeableConfig } from './get_upgradeable_config';

export async function createOrUpgradeSavedConfig(options) {
  const {
    savedObjectsClient,
    version,
    buildNum,
    logWithMetadata,
    onWriteError,
  } = options;

  // try to find an older config we can upgrade
  const upgradeableConfig = await getUpgradeableConfig({
    savedObjectsClient,
    version
  });

  // default to the attributes of the upgradeableConfig if available
  const attributes = defaults(
    { buildNum },
    upgradeableConfig ? upgradeableConfig.attributes : {}
  );

  try {
    // create the new SavedConfig
    await savedObjectsClient.create(
      'config',
      attributes,
      { id: version }
    );
  } catch (error) {
    if (onWriteError) {
      return onWriteError(error, attributes);
    }

    throw error;
  }

  if (upgradeableConfig) {
    logWithMetadata(['plugin', 'elasticsearch'], `Upgrade config from ${upgradeableConfig.id} to ${version}`, {
      prevVersion: upgradeableConfig.id,
      newVersion: version
    });
  }
}
