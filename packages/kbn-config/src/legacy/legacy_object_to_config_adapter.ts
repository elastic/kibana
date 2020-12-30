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

  private static transformPlugins(configValue: LegacyVars) {
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
