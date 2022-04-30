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
          sniffOnStart: {
            type: 'boolean',
            _meta: {
              description:
                'Indicates if an attempt should be made to find other Elasticsearch nodes on startup.',
            },
          },
          sniffIntervalMs: {
            type: 'long',
            _meta: {
              description:
                'Time in milliseconds between requests to check Elasticsearch for an updated list of nodes.',
            },
          },
          sniffOnConnectionFault: {
            type: 'boolean',
            _meta: {
              description:
                'Indicates if the list of Elasticsearch nodes should be updated immediately following a connection fault.',
            },
          },
          numberOfHostsConfigured: {
            type: 'long',
            _meta: {
              description: 'Number of Elasticsearch instances configured to use for queries.',
            },
          },
          requestHeadersWhitelistConfigured: {
            type: 'boolean',
            _meta: {
              description:
                'Indicates if Kibana client-side headers to send to Elasticsearch is different to the default value.',
            },
          },
          customHeadersConfigured: {
            type: 'boolean',
            _meta: { description: 'Indicates if any custom headers have been configured.' },
          },
          shardTimeoutMs: {
            type: 'long',
            _meta: {
              description:
                'Time in milliseconds for Elasticsearch to wait for responses from shards.',
            },
          },
          requestTimeoutMs: {
            type: 'long',
            _meta: {
              description:
                'Time in milliseconds to wait for responses from the back end or Elasticsearch.',
            },
          },
          pingTimeoutMs: {
            type: 'long',
            _meta: {
              description: 'Time in milliseconds to wait for Elasticsearch to respond to pings.',
            },
          },
          logQueries: {
            type: 'boolean',
            _meta: { description: 'Indicates if queries sent to Elasticsearch should be logged.' },
          },
          ssl: {
            verificationMode: {
              type: 'keyword',
              _meta: {
                description:
                  'The verification of the server certificate that Kibana receives when making an outbound SSL or TLS connection to Elasticsearch',
              },
            },
            certificateAuthoritiesConfigured: {
              type: 'boolean',
              _meta: {
                description:
                  'Indicates if any PEM-encoded X.509 certificate authority certificates are configured.',
              },
            },
            certificateConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if a certificate authority is configured.' },
            },
            keyConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if a certificate key is configured.' },
            },
            keystoreConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if a keystore is configured.' },
            },
            truststoreConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if a path to a PKCS#12 trust store is configured.' },
            },
            alwaysPresentCertificate: {
              type: 'boolean',
              _meta: {
                description:
                  'Indicates if a client certificate is presented when requested by Elasticsearch.',
              },
            },
          },
          apiVersion: {
            type: 'keyword',
            _meta: { description: 'Version of the Elasticsearch API used.' },
          },
          healthCheckDelayMs: {
            type: 'long',
            _meta: {
              description:
                'The interval in miliseconds between health check requests Kibana sends to the Elasticsearch.',
            },
          },
          principal: {
            type: 'keyword',
            _meta: {
              description:
                'Indicates how Kibana authenticates itself to Elasticsearch. If elasticsearch.username is configured, this can be any of: "elastic_user", "kibana_user", "kibana_system_user", or "other_user". Otherwise, if elasticsearch.serviceAccountToken is configured, this will be "kibana_service_account". Otherwise, this value will be "unknown", because some other principal might be used to authenticate Kibana to Elasticsearch (such as an x509 certificate), or authentication may be skipped altogether.',
            },
          },
        },

        http: {
          basePathConfigured: {
            type: 'boolean',
            _meta: { description: 'Indicates if a base path has been configured.' },
          },
          maxPayloadInBytes: {
            type: 'long',
            _meta: { description: 'Maximum payload size in bytes that is allowed.' },
          },
          rewriteBasePath: {
            type: 'boolean',
            _meta: { description: 'Indicates if the base path should be rewritten.' },
          },
          keepaliveTimeout: {
            type: 'long',
            _meta: { description: 'How long to keep sockets alive globally in milliseconds.' },
          },
          socketTimeout: {
            type: 'long',
            _meta: {
              description: 'How long to wait before closing inactive sockets in milliseconds.',
            },
          },
          compression: {
            enabled: {
              type: 'boolean',
              _meta: { description: 'Indicates if HTTP response compression is enabled.' },
            },
            referrerWhitelistConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if any responses should be compressed.' },
            },
          },
          xsrf: {
            disableProtection: {
              type: 'boolean',
              _meta: { description: 'Indicates if protection against xsrf should be disabled.' },
            },
            allowlistConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if any http headers have been whitelisted.' },
            },
          },
          requestId: {
            allowFromAnyIp: {
              type: 'boolean',
              _meta: { description: 'Indicates if any http headers have been whitelisted.' },
            },
            ipAllowlistConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if a list of specific IPs has been configured.' },
            },
          },
          ssl: {
            certificateAuthoritiesConfigured: {
              type: 'boolean',
              _meta: {
                description: 'Indicates if ssl certificate authorities have been configured.',
              },
            },
            certificateConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if an ssl certificate is configured.' },
            },
            cipherSuites: {
              type: 'array',
              items: {
                type: 'keyword',
                _meta: { description: 'The keyword of the cipher suite used.' },
              },
            },
            keyConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if an ssl key has been configured.' },
            },
            keystoreConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if an ssl keystore has been configured.' },
            },
            truststoreConfigured: {
              type: 'boolean',
              _meta: { description: 'Indicates if a path to a PKCS#12 trust store is configured.' },
            },
            redirectHttpFromPortConfigured: {
              type: 'boolean',
              _meta: {
                description:
                  'Indicates if a port to redirect all http requests has been configured.',
              },
            },
            supportedProtocols: {
              type: 'array',
              items: {
                type: 'keyword',
                _meta: { description: 'The version of a supported protocol used.' },
              },
            },
            clientAuthentication: {
              type: 'keyword',
              _meta: {
                description:
                  'The behavior in Kibana for requesting a certificate from client connections.',
              },
            },
          },
          securityResponseHeaders: {
            strictTransportSecurity: {
              type: 'keyword',
              _meta: {
                description: 'The strictTransportSecurity response header, "NULL" if disabled.',
              },
            },
            xContentTypeOptions: {
              type: 'keyword',
              _meta: {
                description: 'The xContentTypeOptions response header, "NULL" if disabled.',
              },
            },
            referrerPolicy: {
              type: 'keyword',
              _meta: { description: 'The referrerPolicy response header, "NULL" if disabled.' },
            },
            permissionsPolicyConfigured: {
              type: 'boolean',
              _meta: {
                description:
                  'Indicates if the permissionsPolicy response header has been configured.',
              },
            },
            disableEmbedding: {
              type: 'boolean',
              _meta: {
                description:
                  'Indicates if security headers to disable embedding have been configured.',
              },
            },
          },
        },

        logging: {
          appendersTypesUsed: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: { description: 'The type of logging appender confgured.' },
            },
          },
          loggersConfiguredCount: {
            type: 'long',
            _meta: { description: 'The total number of logging appenders configured.' },
          },
        },

        savedObjects: {
          customIndex: {
            type: 'boolean',
            _meta: {
              description:
                'Indicates if the saved objects index is different to the standard internal .kibana index.',
            },
          },
          maxImportPayloadBytes: {
            type: 'long',
            _meta: {
              description:
                'Maximum size of the payload in bytes of saved objects that can be imported.',
            },
          },
          maxImportExportSize: {
            type: 'long',
            _meta: {
              description: 'Maximum count of saved objects that can be imported or exported.',
            },
          },
        },

        deprecatedKeys: {
          set: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: { description: 'Config path added during config deprecation.' },
            },
          },
          unset: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: { description: 'Config path removed during config deprecation.' },
            },
          },
        },
      },
      environment: {
        memory: {
          heapSizeLimit: { type: 'long', _meta: { description: 'Host memory heap size limit.' } },
          heapTotalBytes: {
            type: 'long',
            _meta: { description: 'Total memory heap size of host that is available in bytes.' },
          },
          heapUsedBytes: {
            type: 'long',
            _meta: { description: 'Total memory heap size of host that is used in bytes.' },
          },
        },
      },
      services: {
        savedObjects: {
          indices: {
            type: 'array',
            items: {
              docsCount: {
                type: 'long',
                _meta: {
                  description:
                    'The number of lucene documents in the index, including hidden nested documents.',
                },
              },
              docsDeleted: {
                type: 'long',
                _meta: {
                  description:
                    'The number of deleted lucene documents in the index, including hidden nested documents.',
                },
              },
              alias: {
                type: 'keyword',
                _meta: {
                  description:
                    'The alias used to map customized saved object index names to standard index names (.kibana or .kibana_task_manager).',
                },
              },
              primaryStoreSizeBytes: {
                type: 'long',
                _meta: { description: 'The size in bytes of the index, for primaries only.' },
              },
              storeSizeBytes: {
                type: 'long',
                _meta: {
                  description: 'The size in bytes of the index, for primaries and replicas.',
                },
              },
              savedObjectsDocsCount: {
                type: 'long',
                _meta: {
                  description: 'The number of saved objects documents in the index.',
                },
              },
            },
          },
          legacyUrlAliases: {
            inactiveCount: {
              type: 'long',
              _meta: {
                description:
                  'Count of legacy URL aliases that are inactive; they are not disabled, but they have not been resolved.',
              },
            },
            activeCount: {
              type: 'long',
              _meta: {
                description:
                  'Count of legacy URL aliases that are active; they are not disabled, and they have been resolved at least once.',
              },
            },
            disabledCount: {
              type: 'long',
              _meta: {
                description: 'Count of legacy URL aliases that are disabled.',
              },
            },
            totalCount: {
              type: 'long',
              _meta: {
                description: 'Total count of legacy URL aliases.',
              },
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
      'apiCalls.savedObjectsBulkResolve.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.savedObjectsBulkResolve.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.savedObjectsBulkResolve.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkResolve.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.savedObjectsBulkResolve.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.savedObjectsBulkResolve.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsBulkResolve.namespace.custom.kibanaRequest.no': {
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
      // Legacy dashboard import/export APIs
      'apiCalls.legacyDashboardExport.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.legacyDashboardExport.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.legacyDashboardExport.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.legacyDashboardExport.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.legacyDashboardExport.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.legacyDashboardExport.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.legacyDashboardExport.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      'apiCalls.savedObjectsExport.allTypesSelected.yes': {
        type: 'long',
        _meta: {
          description: 'How many times this API has been called with all types selected.',
        },
      },
      'apiCalls.savedObjectsExport.allTypesSelected.no': {
        type: 'long',
        _meta: {
          description: 'How many times this API has been called without all types selected.',
        },
      },
      'apiCalls.legacyDashboardImport.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called.' },
      },
      'apiCalls.legacyDashboardImport.namespace.default.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in the Default space.' },
      },
      'apiCalls.legacyDashboardImport.namespace.default.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in the Default space.',
        },
      },
      'apiCalls.legacyDashboardImport.namespace.default.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in the Default space.',
        },
      },
      'apiCalls.legacyDashboardImport.namespace.custom.total': {
        type: 'long',
        _meta: { description: 'How many times this API has been called in a custom space.' },
      },
      'apiCalls.legacyDashboardImport.namespace.custom.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by the Kibana client in a custom space.',
        },
      },
      'apiCalls.legacyDashboardImport.namespace.custom.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'How many times this API has been called by a non-Kibana client in a custom space.',
        },
      },
      // Saved Objects Repository counters
      'savedObjectsRepository.resolvedOutcome.exactMatch': {
        type: 'long',
        _meta: {
          description: 'How many times a saved object has resolved with an exact match outcome.',
        },
      },
      'savedObjectsRepository.resolvedOutcome.aliasMatch': {
        type: 'long',
        _meta: {
          description: 'How many times a saved object has resolved with an alias match outcome.',
        },
      },
      'savedObjectsRepository.resolvedOutcome.conflict': {
        type: 'long',
        _meta: {
          description: 'How many times a saved object has resolved with a conflict outcome.',
        },
      },
      'savedObjectsRepository.resolvedOutcome.notFound': {
        type: 'long',
        _meta: {
          description: 'How many times a saved object has resolved with a not found outcome.',
        },
      },
      'savedObjectsRepository.resolvedOutcome.total': {
        type: 'long',
        _meta: {
          description:
            'How many times a saved object has resolved with any of the four possible outcomes.',
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
