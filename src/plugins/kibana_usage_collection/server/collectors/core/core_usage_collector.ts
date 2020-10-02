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

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  CoreUsageData,
  CoreUsageDataStart,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../core/server/core_usage_data/types';
// telemetry_check is unable to check types which are re-exported, it only
// works when pointed to the typescript file where the type was defined.
import { KIBANA_STATS_TYPE } from '../../../common/constants';

export function getCoreUsageCollector(
  usageCollection: UsageCollectionSetup,
  getCoreUsageDataService: () => CoreUsageDataStart
) {
  return usageCollection.makeUsageCollector<CoreUsageData, { core: CoreUsageData }>({
    type: 'core',
    isReady: () => true,
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
            whitelistConfigured: { type: 'boolean' },
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
        os: {
          distro: { type: 'keyword' },
          distroRelease: { type: 'keyword' },
          platform: { type: 'keyword' },
          platformRelease: { type: 'keyword' },
        },
      },
    },
    fetch() {
      return getCoreUsageDataService().getCoreUsageData();
    },

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage namespace of the data payload (usage.index, etc)
     */
    formatForBulkUpload: (result) => {
      return {
        type: KIBANA_STATS_TYPE,
        payload: {
          core: result,
        },
      };
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
