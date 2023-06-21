/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Usage data from Core services
 * @public
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
      savedObjectsDocsCount: number;
    }[];
    legacyUrlAliases: {
      activeCount: number;
      inactiveCount: number;
      disabledCount: number;
      totalCount: number;
    };
  };
}

/**
 * Usage data on this Kibana node's runtime environment.
 * @public
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
 * @public
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
    principal:
      | 'elastic_user'
      | 'kibana_user'
      | 'kibana_system_user'
      | 'other_user'
      | 'kibana_service_account'
      | 'unknown';
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
      allowlistConfigured: boolean;
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
    securityResponseHeaders: {
      strictTransportSecurity: string;
      xContentTypeOptions: string;
      referrerPolicy: string;
      permissionsPolicyConfigured: boolean;
      disableEmbedding: boolean;
      crossOriginOpenerPolicy: string;
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
    customIndex: boolean;
    maxImportPayloadBytes: number;
    maxImportExportSize: number;
  };

  // uiSettings: {
  //   overridesCount: number;
  // };

  deprecatedKeys: {
    set: string[];
    unset: string[];
  };
}
