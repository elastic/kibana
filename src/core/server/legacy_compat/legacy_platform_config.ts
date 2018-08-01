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

import { NEW_PLATFORM_CONFIG_ROOT, ObjectToRawConfigAdapter, RawConfig } from '../config';
import { ConfigPath } from '../config/config_service';

/**
 * Represents legacy Kibana config class.
 * @internal
 */
export interface LegacyConfig {
  get: (configPath: string) => any;
  set: (configPath: string, configValue: any) => void;
  has: (configPath: string) => boolean;
}

/**
 * Represents logging config supported by the legacy platform.
 */
interface LegacyLoggingConfig {
  silent: boolean;
  verbose: boolean;
  quiet: boolean;
  dest: string;
  json: boolean;
}

/**
 * Represents adapter between config provided by legacy platform and `RawConfig`
 * supported by the current platform.
 */
export class LegacyConfigToRawConfigAdapter implements RawConfig {
  private static flattenConfigPath(configPath: ConfigPath) {
    if (!Array.isArray(configPath)) {
      return configPath;
    }

    return configPath.join('.');
  }

  private static transformLogging(configValue: LegacyLoggingConfig) {
    const loggingConfig = {
      appenders: { default: { kind: 'legacy-appender' } },
      root: { level: 'info' },
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

  private static transformServer(configValue: any) {
    // TODO: New platform uses just a subset of `server` config from the legacy platform,
    // new values will be exposed once we need them (eg. customResponseHeaders, cors or xsrf).
    return {
      basePath: configValue.basePath,
      cors: configValue.cors,
      host: configValue.host,
      maxPayload: configValue.maxPayloadBytes,
      port: configValue.port,
      rewriteBasePath: configValue.rewriteBasePath,
      ssl: configValue.ssl,
    };
  }

  private static isNewPlatformConfig(configPath: ConfigPath) {
    if (Array.isArray(configPath)) {
      return configPath[0] === NEW_PLATFORM_CONFIG_ROOT;
    }

    return configPath.startsWith(NEW_PLATFORM_CONFIG_ROOT);
  }

  private newPlatformConfig: ObjectToRawConfigAdapter;

  constructor(private readonly legacyConfig: LegacyConfig) {
    this.newPlatformConfig = new ObjectToRawConfigAdapter({
      [NEW_PLATFORM_CONFIG_ROOT]: legacyConfig.get(NEW_PLATFORM_CONFIG_ROOT) || {},
    });
  }

  public has(configPath: ConfigPath) {
    if (LegacyConfigToRawConfigAdapter.isNewPlatformConfig(configPath)) {
      return this.newPlatformConfig.has(configPath);
    }

    return this.legacyConfig.has(LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath));
  }

  public get(configPath: ConfigPath) {
    if (LegacyConfigToRawConfigAdapter.isNewPlatformConfig(configPath)) {
      return this.newPlatformConfig.get(configPath);
    }

    configPath = LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath);

    const configValue = this.legacyConfig.get(configPath);

    switch (configPath) {
      case 'logging':
        return LegacyConfigToRawConfigAdapter.transformLogging(configValue);
      case 'server':
        return LegacyConfigToRawConfigAdapter.transformServer(configValue);
      default:
        return configValue;
    }
  }

  public set(configPath: ConfigPath, value: any) {
    if (LegacyConfigToRawConfigAdapter.isNewPlatformConfig(configPath)) {
      return this.newPlatformConfig.set(configPath, value);
    }

    this.legacyConfig.set(LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath), value);
  }

  public getFlattenedPaths() {
    // This method is only used to detect unused config paths, but when we run
    // new platform within the legacy one then the new platform is in charge of
    // only `__newPlatform` config node and the legacy platform will check the rest.
    return this.newPlatformConfig.getFlattenedPaths();
  }
}
