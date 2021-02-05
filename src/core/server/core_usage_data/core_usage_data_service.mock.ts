/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { BehaviorSubject } from 'rxjs';
import { CoreUsageDataService } from './core_usage_data_service';
import { coreUsageStatsClientMock } from './core_usage_stats_client.mock';
import { CoreUsageData, CoreUsageDataSetup, CoreUsageDataStart } from './types';

const createSetupContractMock = (usageStatsClient = coreUsageStatsClientMock.create()) => {
  const setupContract: jest.Mocked<CoreUsageDataSetup> = {
    registerType: jest.fn(),
    getClient: jest.fn().mockReturnValue(usageStatsClient),
  };
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: jest.Mocked<CoreUsageDataStart> = {
    getCoreUsageData: jest.fn().mockResolvedValue(
      new BehaviorSubject<CoreUsageData>({
        config: {
          elasticsearch: {
            apiVersion: 'master',
            customHeadersConfigured: false,
            healthCheckDelayMs: 2500,
            logQueries: false,
            numberOfHostsConfigured: 1,
            pingTimeoutMs: 30000,
            requestHeadersWhitelistConfigured: false,
            requestTimeoutMs: 30000,
            shardTimeoutMs: 30000,
            sniffIntervalMs: -1,
            sniffOnConnectionFault: false,
            sniffOnStart: false,
            ssl: {
              alwaysPresentCertificate: false,
              certificateAuthoritiesConfigured: false,
              certificateConfigured: false,
              keyConfigured: false,
              verificationMode: 'full',
              keystoreConfigured: false,
              truststoreConfigured: false,
            },
          },
          http: {
            basePathConfigured: false,
            compression: {
              enabled: true,
              referrerWhitelistConfigured: false,
            },
            keepaliveTimeout: 120000,
            maxPayloadInBytes: 1048576,
            requestId: {
              allowFromAnyIp: false,
              ipAllowlistConfigured: false,
            },
            rewriteBasePath: false,
            socketTimeout: 120000,
            ssl: {
              certificateAuthoritiesConfigured: false,
              certificateConfigured: false,
              cipherSuites: [
                'ECDHE-RSA-AES128-GCM-SHA256',
                'ECDHE-ECDSA-AES128-GCM-SHA256',
                'ECDHE-RSA-AES256-GCM-SHA384',
                'ECDHE-ECDSA-AES256-GCM-SHA384',
                'DHE-RSA-AES128-GCM-SHA256',
                'ECDHE-RSA-AES128-SHA256',
                'DHE-RSA-AES128-SHA256',
                'ECDHE-RSA-AES256-SHA384',
                'DHE-RSA-AES256-SHA384',
                'ECDHE-RSA-AES256-SHA256',
                'DHE-RSA-AES256-SHA256',
                'HIGH',
                '!aNULL',
                '!eNULL',
                '!EXPORT',
                '!DES',
                '!RC4',
                '!MD5',
                '!PSK',
                '!SRP',
                '!CAMELLIA',
              ],
              clientAuthentication: 'none',
              keyConfigured: false,
              keystoreConfigured: false,
              redirectHttpFromPortConfigured: false,
              supportedProtocols: ['TLSv1.1', 'TLSv1.2'],
              truststoreConfigured: false,
            },
            xsrf: {
              disableProtection: false,
              allowlistConfigured: false,
            },
          },
          logging: {
            appendersTypesUsed: [],
            loggersConfiguredCount: 0,
          },
          savedObjects: {
            maxImportExportSizeBytes: 10000,
            maxImportPayloadBytes: 26214400,
          },
        },
        environment: {
          memory: {
            heapSizeLimit: 1,
            heapTotalBytes: 1,
            heapUsedBytes: 1,
          },
        },
        services: {
          savedObjects: {
            indices: [
              {
                docsCount: 1,
                docsDeleted: 1,
                alias: 'test_index',
                primaryStoreSizeBytes: 1,
                storeSizeBytes: 1,
              },
            ],
          },
        },
      })
    ),
  };

  return startContract;
};

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<CoreUsageDataService>> = {
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
    stop: jest.fn(),
  };
  return mocked;
};

export const coreUsageDataServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
