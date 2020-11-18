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

import { CoreTelemetry } from '../core_telemetry';

/**
 * Type describing Core's usage data payload
 * @internal
 */
export interface CoreUsageData extends CoreTelemetry {
  config: CoreConfigUsageData;
  services: CoreServicesUsageData;
  environment: CoreEnvironmentUsageData;
}

/**
 * Usage data from Core services
 * @internal
 */
export interface CoreServicesUsageData {
  savedObjects: {
    // scripts/telemetry_check.js does not support parsing Array<{...}> types
    // so we have to disable eslint here and use {...}[]
    // eslint-disable-next-line @typescript-eslint/array-type
    indices: {
      alias: string;
      docsCount: number;
      docsDeleted: number;
      storeSizeBytes: number;
      primaryStoreSizeBytes: number;
    }[];
  };
}

/**
 * Usage data on this Kibana node's runtime environment.
 * @internal
 */
export interface CoreEnvironmentUsageData {
  memory: {
    heapTotalBytes: number;
    heapUsedBytes: number;
    /** V8 heap size limit */
    heapSizeLimit: number;
  };
}

/**
 * Usage data on this cluster's configuration of Core features
 * @internal
 */
export interface CoreConfigUsageData {
  elasticsearch: {
    sniffOnStart: boolean;
    sniffIntervalMs?: number;
    sniffOnConnectionFault: boolean;
    numberOfHostsConfigured: number;
    requestHeadersWhitelistConfigured: boolean;
    customHeadersConfigured: boolean;
    shardTimeoutMs: number;
    requestTimeoutMs: number;
    pingTimeoutMs: number;
    logQueries: boolean;
    ssl: {
      verificationMode: 'none' | 'certificate' | 'full';
      certificateAuthoritiesConfigured: boolean;
      certificateConfigured: boolean;
      keyConfigured: boolean;
      keystoreConfigured: boolean;
      truststoreConfigured: boolean;
      alwaysPresentCertificate: boolean;
    };
    apiVersion: string;
    healthCheckDelayMs: number;
  };

  http: {
    basePathConfigured: boolean;
    maxPayloadInBytes: number;
    rewriteBasePath: boolean;
    keepaliveTimeout: number;
    socketTimeout: number;
    compression: {
      enabled: boolean;
      referrerWhitelistConfigured: boolean;
    };
    xsrf: {
      disableProtection: boolean;
      whitelistConfigured: boolean;
    };
    requestId: {
      allowFromAnyIp: boolean;
      ipAllowlistConfigured: boolean;
    };
    ssl: {
      certificateAuthoritiesConfigured: boolean;
      certificateConfigured: boolean;
      cipherSuites: string[];
      keyConfigured: boolean;
      keystoreConfigured: boolean;
      truststoreConfigured: boolean;
      redirectHttpFromPortConfigured: boolean;
      supportedProtocols: string[];
      clientAuthentication: 'none' | 'optional' | 'required';
    };
  };

  logging: {
    appendersTypesUsed: string[];
    loggersConfiguredCount: number;
  };

  // plugins: {
  //   /** list of built-in plugins that are disabled */
  //   firstPartyDisabled: string[];
  //   /** list of third-party plugins that are installed and enabled */
  //   thirdParty: string[];
  // };

  savedObjects: {
    maxImportPayloadBytes: number;
    maxImportExportSizeBytes: number;
  };

  // uiSettings: {
  //   overridesCount: number;
  // };
}

/**
 * Internal API for getting Core's usage data payload.
 *
 * @note This API should never be used to drive application logic and is only
 * intended for telemetry purposes.
 *
 * @internal
 */
export interface CoreUsageDataStart {
  /**
   * Internal API for getting Core's usage data payload.
   *
   * @note This API should never be used to drive application logic and is only
   * intended for telemetry purposes.
   *
   * @internal
   * */
  getCoreUsageData(): Promise<CoreUsageData>;
}
