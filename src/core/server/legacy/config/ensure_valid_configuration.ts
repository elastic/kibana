/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getUnusedConfigKeys } from './get_unused_config_keys';
import { ConfigService } from '../../config';
import { CriticalError } from '../../errors';
import { LegacyServiceSetupConfig } from '../types';

export async function ensureValidConfiguration(
  configService: ConfigService,
  { legacyConfig, settings }: LegacyServiceSetupConfig
) {
  const unusedConfigKeys = await getUnusedConfigKeys({
    coreHandledConfigPaths: await configService.getUsedPaths(),
    settings,
    legacyConfig,
  });

  if (unusedConfigKeys.length > 0) {
    const message = `Unknown configuration key(s): ${unusedConfigKeys
      .map((key) => `"${key}"`)
      .join(', ')}. Check for spelling errors and ensure that expected plugins are installed.`;
    throw new InvalidConfigurationError(message);
  }
}

class InvalidConfigurationError extends CriticalError {
  constructor(message: string) {
    super(message, 'InvalidConfig', 64);
    Object.setPrototypeOf(this, InvalidConfigurationError.prototype);
  }
}
