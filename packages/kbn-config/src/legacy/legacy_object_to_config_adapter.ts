/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigPath } from '../config';
import { ObjectToConfigAdapter } from '../object_to_config_adapter';

/**
 * Represents logging config supported by the legacy platform.
 */
export interface LegacyLoggingConfig {
  silent?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  dest?: string;
  json?: boolean;
  events?: Record<string, string>;
}

type MixedLoggingConfig = LegacyLoggingConfig & Record<string, any>;

/**
 * Represents adapter between config provided by legacy platform and `Config`
 * supported by the current platform.
 * @internal
 */
export class LegacyObjectToConfigAdapter extends ObjectToConfigAdapter {
  private static transformLogging(configValue: MixedLoggingConfig = {}) {
    const { appenders, root, loggers, ...legacyLoggingConfig } = configValue;

    const loggingConfig = {
      appenders: {
        ...appenders,
        default: { type: 'legacy-appender', legacyLoggingConfig },
      },
      root: { level: 'info', ...root },
      loggers,
      ...legacyLoggingConfig,
    };

    if (configValue.silent) {
      loggingConfig.root.level = 'off';
    } else if (configValue.quiet) {
      loggingConfig.root.level = 'error';
    } else if (configValue.verbose) {
      loggingConfig.root.level = 'all';
    }

    return loggingConfig;
  }

  public get(configPath: ConfigPath) {
    const configValue = super.get(configPath);
    switch (configPath) {
      case 'logging':
        return LegacyObjectToConfigAdapter.transformLogging(configValue as LegacyLoggingConfig);
      default:
        return configValue;
    }
  }
}
