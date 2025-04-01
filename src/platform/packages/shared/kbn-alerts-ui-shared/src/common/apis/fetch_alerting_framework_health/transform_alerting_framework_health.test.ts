/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HealthStatus } from '@kbn/alerting-types';
import {
  transformAlertsHealthResponse,
  transformAlertingFrameworkHealthResponse,
} from './transform_alerting_framework_health_response';

describe('transformAlertingFrameworkHealth', () => {
  test('should transform alerts health response', () => {
    expect(
      transformAlertsHealthResponse({
        decryption_health: {
          status: HealthStatus.OK,
          timestamp: new Date('01-01-2024').toISOString(),
        },
        execution_health: {
          status: HealthStatus.OK,
          timestamp: new Date('01-02-2024').toISOString(),
        },
        read_health: {
          status: HealthStatus.OK,
          timestamp: new Date('01-03-2024').toISOString(),
        },
      })
    ).toEqual({
      decryptionHealth: {
        status: 'ok',
        timestamp: new Date('01-01-2024').toISOString(),
      },
      executionHealth: {
        status: 'ok',
        timestamp: new Date('01-02-2024').toISOString(),
      },
      readHealth: {
        status: 'ok',
        timestamp: new Date('01-03-2024').toISOString(),
      },
    });
  });

  test('should transform alerting framework health response', () => {
    expect(
      transformAlertingFrameworkHealthResponse({
        is_sufficiently_secure: true,
        has_permanent_encryption_key: true,
        alerting_framework_health: {
          decryptionHealth: {
            status: HealthStatus.OK,
            timestamp: new Date('01-01-2024').toISOString(),
          },
          executionHealth: {
            status: HealthStatus.OK,
            timestamp: new Date('01-02-2024').toISOString(),
          },
          readHealth: {
            status: HealthStatus.OK,
            timestamp: new Date('01-03-2024').toISOString(),
          },
        },
      })
    ).toEqual({
      alertingFrameworkHealth: {
        decryptionHealth: {
          status: 'ok',
          timestamp: new Date('01-01-2024').toISOString(),
        },
        executionHealth: {
          status: 'ok',
          timestamp: new Date('01-02-2024').toISOString(),
        },
        readHealth: {
          status: 'ok',
          timestamp: new Date('01-03-2024').toISOString(),
        },
      },
      hasPermanentEncryptionKey: true,
      isSufficientlySecure: true,
    });
  });
});
