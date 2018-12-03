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

import { ConfigPath, ObjectToConfigAdapter } from '../../config';

/**
 * Represents logging config supported by the legacy platform.
 */
interface LegacyLoggingConfig {
  silent?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  dest?: string;
  json?: boolean;
  events?: Record<string, string>;
}

/**
 * Represents adapter between config provided by legacy platform and `Config`
 * supported by the current platform.
 */
export class LegacyObjectToConfigAdapter extends ObjectToConfigAdapter {
  private static transformLogging(configValue: LegacyLoggingConfig = {}) {
    const loggingConfig = {
      appenders: {
        default: { kind: 'legacy-appender', legacyLoggingConfig: configValue },
      },
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

  private static transformServer(configValue: any = {}) {
    // TODO: New platform uses just a subset of `server` config from the legacy platform,
    // new values will be exposed once we need them (eg. customResponseHeaders or xsrf).
    return {
      autoListen: configValue.autoListen,
      basePath: configValue.basePath,
      cors: configValue.cors,
      host: configValue.host,
      maxPayload: configValue.maxPayloadBytes,
      port: configValue.port,
      rewriteBasePath: configValue.rewriteBasePath,
      ssl: configValue.ssl && LegacyObjectToConfigAdapter.transformSSL(configValue.ssl),
    };
  }

  private static transformSSL(configValue: Record<string, any>) {
    // `server.ssl.cert` is deprecated, legacy platform will issue deprecation warning.
    if (configValue.cert) {
      configValue.certificate = configValue.cert;
      delete configValue.cert;
    }

    // Enabling ssl by only specifying server.ssl.certificate and server.ssl.key is deprecated,
    // legacy platform will issue deprecation warning.
    if (typeof configValue.enabled !== 'boolean' && configValue.certificate && configValue.key) {
      configValue.enabled = true;
    }

    return configValue;
  }

  public get(configPath: ConfigPath) {
    const configValue = super.get(configPath);
    switch (configPath) {
      case 'logging':
        return LegacyObjectToConfigAdapter.transformLogging(configValue);
      case 'server':
        return LegacyObjectToConfigAdapter.transformServer(configValue);
      default:
        return configValue;
    }
  }
}
