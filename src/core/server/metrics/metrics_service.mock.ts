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
import { BehaviorSubject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { MetricsService } from './metrics_service';
import {
  InternalMetricsServiceSetup,
  InternalMetricsServiceStart,
  MetricsServiceSetup,
  MetricsServiceStart,
} from './types';

const createInternalSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalMetricsServiceSetup> = {
    collectionInterval: 30000,
    getOpsMetrics$: jest.fn(),
  };
  setupContract.getOpsMetrics$.mockReturnValue(
    new BehaviorSubject({
      collected_at: new Date('2020-01-01 01:00:00'),
      process: {
        memory: {
          heap: { total_in_bytes: 1, used_in_bytes: 1, size_limit: 1 },
          resident_set_size_in_bytes: 1,
        },
        event_loop_delay: 1,
        pid: 1,
        uptime_in_millis: 1,
      },
      os: {
        platform: 'darwin' as const,
        platformRelease: 'test',
        load: { '1m': 1, '5m': 1, '15m': 1 },
        memory: { total_in_bytes: 1, free_in_bytes: 1, used_in_bytes: 1 },
        uptime_in_millis: 1,
      },
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
};
