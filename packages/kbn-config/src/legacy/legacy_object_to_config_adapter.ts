/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ConfigPath } from '../config';
import { ObjectToConfigAdapter } from '../object_to_config_adapter';

// TODO: fix once core schemas are moved to this package
type LoggingConfigType = any;

/**
 * @internal
 * @deprecated
 */
export type LegacyVars = Record<string, any>;

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

type MixedLoggingConfig = LegacyLoggingConfig & Partial<LoggingConfigType>;

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
        default: { kind: 'legacy-appender', legacyLoggingConfig },
      },
      root: { level: 'info', ...root },
      loggers,
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

  private static transformServer(configValue: any = {}) {
    // TODO: New platform uses just a subset of `server` config from the legacy platform,
    // new values will be exposed once we need them
    return {
      autoListen: configValue.autoListen,
      basePath: configValue.basePath,
      cors: configValue.cors,
      customResponseHeaders: configValue.customResponseHeaders,
      host: configValue.host,
      maxPayload: configValue.maxPayloadBytes,
      name: configValue.name,
      port: configValue.port,
      publicBaseUrl: configValue.publicBaseUrl,
      rewriteBasePath: configValue.rewriteBasePath,
      ssl: configValue.ssl,
      keepaliveTimeout: configValue.keepaliveTimeout,
      socketTimeout: configValue.socketTimeout,
      compression: configValue.compression,
      uuid: configValue.uuid,
      xsrf: configValue.xsrf,
    };
  }

  private static transformPlugins(configValue: LegacyVars = {}) {
    // These properties are the only ones we use from the existing `plugins` config node
    // since `scanDirs` isn't respected by new platform plugin discovery.
    return {
      initialize: configValue.initialize,
      paths: configValue.paths,
    };
  }

  public get(configPath: ConfigPath) {
    const configValue = super.get(configPath);
    switch (configPath) {
      case 'logging':
        return LegacyObjectToConfigAdapter.transformLogging(configValue as LegacyLoggingConfig);
      case 'server':
        return LegacyObjectToConfigAdapter.transformServer(configValue);
      case 'plugins':
        return LegacyObjectToConfigAdapter.transformPlugins(configValue as LegacyVars);
      default:
        return configValue;
    }
  }
}
