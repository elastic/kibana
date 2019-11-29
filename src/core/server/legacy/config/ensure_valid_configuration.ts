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

import { getUnusedConfigKeys } from '../../../../legacy/server/config/get_unused_config_keys';
import { ConfigService } from '../../config';
import { LegacyServiceDiscoverPlugins } from '../legacy_service';

export async function ensureValidConfiguration(
  configService: ConfigService,
  { pluginSpecs, disabledPluginSpecs, pluginExtendedConfig, settings }: LegacyServiceDiscoverPlugins
) {
  const unusedConfigKeys = await getUnusedConfigKeys(
    await configService.getUsedPaths(),
    pluginSpecs,
    disabledPluginSpecs,
    settings,
    pluginExtendedConfig
  );

  if (unusedConfigKeys.length > 0) {
    const message = `Unknown configuration key(s): ${unusedConfigKeys
      .map(key => `"${key}"`)
      .join(', ')}. Check for spelling errors and ensure that expected plugins are installed.`;
    throw new InvalidConfigurationError(message);
  }
}

class InvalidConfigurationError extends Error {
  public cause?: Error;
  public code = 'InvalidConfig';
  public processExitCode = 64;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidConfigurationError.prototype);
  }
}
