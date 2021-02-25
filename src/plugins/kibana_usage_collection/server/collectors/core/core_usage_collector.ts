/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
          customIndex: { type: 'boolean' },
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
              alias: { type: 'keyword' },
              primaryStoreSizeBytes: { type: 'long' },
              storeSizeBytes: { type: 'long' },
            },
          },
        },
      },
      // Saved Objects Client APIs
      'apiCalls.savedObjectsBulkCreate.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsBulkCreate.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkCreate.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsBulkGet.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsBulkGet.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkGet.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsBulkUpdate.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsBulkUpdate.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkUpdate.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsCreate.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsCreate.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsCreate.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsDelete.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsDelete.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsDelete.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsFind.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsFind.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsFind.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsFind.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsFind.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsGet.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsGet.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsGet.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsGet.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsGet.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsResolve.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsResolve.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsResolve.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsResolve.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsResolve.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsResolve.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsResolve.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsUpdate.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsUpdate.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsUpdate.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      // Saved Objects Management APIs
      'apiCalls.savedObjectsImport.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsImport.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsImport.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsImport.createNewCopiesEnabled.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called with the `createNewCopiesEnabled` option.',
        },
      },
      'apiCalls.savedObjectsImport.createNewCopiesEnabled.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called without the `createNewCopiesEnabled` option.',
        },
      },
      'apiCalls.savedObjectsImport.overwriteEnabled.yes': {
        type: 'long',
        _meta: {
          description: 'How many times this API has been called with the `overwrite` option.',
        },
      },
      'apiCalls.savedObjectsImport.overwriteEnabled.no': {
        type: 'long',
        _meta: {
          description: 'How many times this API has been called without the `overwrite` option.',
        },
      },
      'apiCalls.savedObjectsResolveImportErrors.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called with the `createNewCopiesEnabled` option.',
        },
      },
      'apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called without the `createNewCopiesEnabled` option.',
        },
      },
      'apiCalls.savedObjectsExport.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsExport.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsExport.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsExport.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsExport.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsExport.allTypesSelected.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called with the `createNewCopiesEnabled` option.',
        },
      },
      'apiCalls.savedObjectsExport.allTypesSelected.no': {
        type: 'long',
        _meta: {
          description: 'How many times this API has been called without all types selected.',
        },
      },
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
