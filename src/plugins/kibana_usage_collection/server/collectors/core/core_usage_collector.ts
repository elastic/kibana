/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CoreUsageData, CoreUsageDataStart } from '../../../../../core/server';

export function getCoreUsageCollector(
  usageCollection: UsageCollectionSetup,
  getCoreUsageDataService: () => CoreUsageDataStart
) {
  return usageCollection.makeUsageCollector<CoreUsageData>({
    type: 'core',
    isReady: () => typeof getCoreUsageDataService() !== 'undefined',
    schema: {
      config: {
        elasticsearch: {
          sniffOnStart: { type: 'boolean' },
          sniffIntervalMs: { type: 'long' },
          sniffOnConnectionFault: { type: 'boolean' },
          numberOfHostsConfigured: { type: 'long' },
          requestHeadersWhitelistConfigured: { type: 'boolean' },
          customHeadersConfigured: { type: 'boolean' },
          shardTimeoutMs: { type: 'long' },
          requestTimeoutMs: { type: 'long' },
          pingTimeoutMs: { type: 'long' },
          logQueries: { type: 'boolean' },
          ssl: {
            verificationMode: { type: 'keyword' },
            certificateAuthoritiesConfigured: { type: 'boolean' },
            certificateConfigured: { type: 'boolean' },
            keyConfigured: { type: 'boolean' },
            keystoreConfigured: { type: 'boolean' },
            truststoreConfigured: { type: 'boolean' },
            alwaysPresentCertificate: { type: 'boolean' },
          },
          apiVersion: { type: 'keyword' },
          healthCheckDelayMs: { type: 'long' },
        },

        http: {
          basePathConfigured: { type: 'boolean' },
          maxPayloadInBytes: { type: 'long' },
          rewriteBasePath: { type: 'boolean' },
          keepaliveTimeout: { type: 'long' },
          socketTimeout: { type: 'long' },
          compression: {
            enabled: { type: 'boolean' },
            referrerWhitelistConfigured: { type: 'boolean' },
          },
          xsrf: {
            disableProtection: { type: 'boolean' },
            allowlistConfigured: { type: 'boolean' },
          },
          requestId: {
            allowFromAnyIp: { type: 'boolean' },
            ipAllowlistConfigured: { type: 'boolean' },
          },
          ssl: {
            certificateAuthoritiesConfigured: { type: 'boolean' },
            certificateConfigured: { type: 'boolean' },
            cipherSuites: { type: 'array', items: { type: 'keyword' } },
            keyConfigured: { type: 'boolean' },
            keystoreConfigured: { type: 'boolean' },
            truststoreConfigured: { type: 'boolean' },
            redirectHttpFromPortConfigured: { type: 'boolean' },
            supportedProtocols: { type: 'array', items: { type: 'keyword' } },
            clientAuthentication: { type: 'keyword' },
          },
        },

        logging: {
          appendersTypesUsed: { type: 'array', items: { type: 'keyword' } },
          loggersConfiguredCount: { type: 'long' },
        },

        savedObjects: {
          maxImportPayloadBytes: { type: 'long' },
          maxImportExportSizeBytes: { type: 'long' },
        },
      },
      environment: {
        memory: {
          heapSizeLimit: { type: 'long' },
          heapTotalBytes: { type: 'long' },
          heapUsedBytes: { type: 'long' },
        },
      },
      services: {
        savedObjects: {
          indices: {
            type: 'array',
            items: {
              docsCount: { type: 'long' },
              docsDeleted: { type: 'long' },
              alias: { type: 'text' },
              primaryStoreSizeBytes: { type: 'long' },
              storeSizeBytes: { type: 'long' },
            },
          },
        },
      },
      // Saved Objects Client APIs
      'apiCalls.savedObjectsBulkCreate.total': { type: 'long' },
      'apiCalls.savedObjectsBulkCreate.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsBulkCreate.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsBulkGet.total': { type: 'long' },
      'apiCalls.savedObjectsBulkGet.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsBulkGet.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsBulkUpdate.total': { type: 'long' },
      'apiCalls.savedObjectsBulkUpdate.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsBulkUpdate.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsCreate.total': { type: 'long' },
      'apiCalls.savedObjectsCreate.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsCreate.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsDelete.total': { type: 'long' },
      'apiCalls.savedObjectsDelete.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsDelete.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsFind.total': { type: 'long' },
      'apiCalls.savedObjectsFind.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsFind.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsFind.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsFind.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsGet.total': { type: 'long' },
      'apiCalls.savedObjectsGet.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsGet.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsGet.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsGet.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsUpdate.total': { type: 'long' },
      'apiCalls.savedObjectsUpdate.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsUpdate.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.no': { type: 'long' },
      // Saved Objects Management APIs
      'apiCalls.savedObjectsImport.total': { type: 'long' },
      'apiCalls.savedObjectsImport.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsImport.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsImport.createNewCopiesEnabled.yes': { type: 'long' },
      'apiCalls.savedObjectsImport.createNewCopiesEnabled.no': { type: 'long' },
      'apiCalls.savedObjectsImport.overwriteEnabled.yes': { type: 'long' },
      'apiCalls.savedObjectsImport.overwriteEnabled.no': { type: 'long' },
      'apiCalls.savedObjectsResolveImportErrors.total': { type: 'long' },
      'apiCalls.savedObjectsResolveImportErrors.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.yes': {
        type: 'long',
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.no': {
        type: 'long',
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.yes': {
        type: 'long',
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.no': {
        type: 'long',
      },
      'apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.yes': { type: 'long' },
      'apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.no': { type: 'long' },
      'apiCalls.savedObjectsExport.total': { type: 'long' },
      'apiCalls.savedObjectsExport.namespace.default.total': { type: 'long' },
      'apiCalls.savedObjectsExport.namespace.default.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsExport.namespace.default.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsExport.namespace.custom.total': { type: 'long' },
      'apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.yes': { type: 'long' },
      'apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.no': { type: 'long' },
      'apiCalls.savedObjectsExport.allTypesSelected.yes': { type: 'long' },
      'apiCalls.savedObjectsExport.allTypesSelected.no': { type: 'long' },
    },
    fetch() {
      return getCoreUsageDataService().getCoreUsageData();
    },
  });
}

export function registerCoreUsageCollector(
  usageCollection: UsageCollectionSetup,
  getCoreUsageDataService: () => CoreUsageDataStart
) {
  usageCollection.registerCollector(
    getCoreUsageCollector(usageCollection, getCoreUsageDataService)
  );
}
