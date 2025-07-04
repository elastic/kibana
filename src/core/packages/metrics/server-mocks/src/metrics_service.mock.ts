/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  MetricsService,
  InternalMetricsServiceSetup,
  InternalMetricsServiceStart,
} from '@kbn/core-metrics-server-internal';
import {
  mocked as eventLoopDelaysMonitorMock,
  collectorMock,
} from '@kbn/core-metrics-collectors-server-mocks';
import type {
  ElasticsearchClientsMetrics,
  MetricsServiceSetup,
  MetricsServiceStart,
} from '@kbn/core-metrics-server';

export const sampleEsClientMetrics: ElasticsearchClientsMetrics = {
  totalActiveSockets: 25,
  totalIdleSockets: 2,
  totalQueuedRequests: 0,
};

const createInternalSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalMetricsServiceSetup> = {
    collectionInterval: 30000,
    getEluMetrics$: jest.fn(),
    getOpsMetrics$: jest.fn(),
  };

  const processMock = collectorMock.createOpsProcessMetrics();

  setupContract.getOpsMetrics$.mockReturnValue(
    new BehaviorSubject({
      collected_at: new Date('2020-01-01 01:00:00'),
      process: processMock,
      processes: [processMock],
      os: {
        platform: 'darwin' as const,
        platformRelease: 'test',
        load: { '1m': 1, '5m': 1, '15m': 1 },
        memory: { total_in_bytes: 1, free_in_bytes: 1, used_in_bytes: 1 },
        uptime_in_millis: 1,
      },
      elasticsearch_client: sampleEsClientMetrics,
      response_times: { avg_in_millis: 1, max_in_millis: 1 },
      requests: { disconnects: 1, total: 1, statusCodes: { '200': 1 } },
      concurrent_connections: 1,
    })
  );
  return setupContract;
};

const createSetupContractMock = () => {
  const startContract: jest.Mocked<MetricsServiceSetup> = createInternalSetupContractMock();
  return startContract;
};

const createInternalStartContractMock = () => {
  const startContract: jest.Mocked<InternalMetricsServiceStart> = createInternalSetupContractMock();
  return startContract;
};

const createStartContractMock = () => {
  const startContract: jest.Mocked<MetricsServiceStart> = createInternalSetupContractMock();
  return startContract;
};

type MetricsServiceContract = PublicMethodsOf<MetricsService>;

const createMock = () => {
  const mocked: jest.Mocked<MetricsServiceContract> = {
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
    stop: jest.fn(),
  };
  return mocked;
};

export const metricsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createEventLoopDelaysMonitor: eventLoopDelaysMonitorMock.createEventLoopDelaysMonitor,
};
