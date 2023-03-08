/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { CsvConfigType } from '@kbn/reporting-generate-csv-types';
import { DeepPartial } from '@kbn/utility-types';
import _ from 'lodash';

interface CsvConfigTestType {
  index: string;
  encryptionKey: string;
  csv: Partial<CsvConfigType>;
}

export const createMockConfig = (reportingConfig: CsvConfigTestType) => {
  const mockConfigGet = jest.fn().mockImplementation((...keys: string[]) => {
    return _.get(reportingConfig, keys.join('.'));
  });
  return {
    get: mockConfigGet,
    kbnConfig: { get: mockConfigGet },
  };
};

export const createMockConfigSchema = (
  overrides: DeepPartial<CsvConfigType> = {}
): CsvConfigType => {
  // deeply merge the defaults and the provided partial schema
  return {
    index: '.reporting',
    encryptionKey: 'cool-encryption-key-where-did-you-find-it',
    ...overrides,
    kibanaServer: {
      hostname: 'localhost',
      port: 80,
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
    roles: {
      enabled: false,
      ...overrides.roles,
    },
    capture: { maxAttempts: 1 },
  } as CsvConfigType;
};
