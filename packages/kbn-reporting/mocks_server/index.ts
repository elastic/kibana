/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeepPartial } from 'utility-types';
import type { ReportingConfigType } from '@kbn/reporting-server';

export const createMockConfigSchema = (
  overrides: DeepPartial<ReportingConfigType> = {}
): ReportingConfigType => {
  // deeply merge the defaults and the provided partial schema
  return {
    index: '.reporting',
    encryptionKey: 'cool-encryption-key-where-did-you-find-it',
    ...overrides,
    kibanaServer: {
      hostname: 'localhost',
      ...overrides.kibanaServer,
    },
    queue: {
      indexInterval: 'week',
      pollEnabled: true,
      pollInterval: 3000,
      timeout: 120000,
      ...overrides.queue,
    },
    csv: {
      scroll: { size: 500, duration: '30s' },
      ...overrides.csv,
    },
    capture: { maxAttempts: 1 },
    export_types: {
      pdf: { enabled: true },
      png: { enabled: true },
      csv: { enabled: true },
      ...overrides.export_types,
    },
    statefulSettings: {
      enabled: true,
      ...overrides.statefulSettings,
    },
  } as ReportingConfigType;
};
