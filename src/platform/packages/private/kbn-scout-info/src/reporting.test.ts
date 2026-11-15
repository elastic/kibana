/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticCloudTargetFromEnv } from './reporting';

// SCOUT_TEST_RUN_SCOPE is read at module load, so each case re-imports the module.
describe('SCOUT_TEST_RUN_SCOPE', () => {
  const originalScope = process.env.SCOUT_TEST_RUN_SCOPE;

  const loadScope = async (scope: string | undefined): Promise<string> => {
    if (scope === undefined) {
      delete process.env.SCOUT_TEST_RUN_SCOPE;
    } else {
      process.env.SCOUT_TEST_RUN_SCOPE = scope;
    }

    jest.resetModules();
    const { SCOUT_TEST_RUN_SCOPE } = await import('./reporting');
    return SCOUT_TEST_RUN_SCOPE;
  };

  afterEach(() => {
    if (originalScope === undefined) {
      delete process.env.SCOUT_TEST_RUN_SCOPE;
    } else {
      process.env.SCOUT_TEST_RUN_SCOPE = originalScope;
    }
  });

  it('is the scope declared via SCOUT_TEST_RUN_SCOPE', async () => {
    expect(await loadScope(' batch-daily-ipv6 ')).toBe('batch-daily-ipv6');
  });

  it.each([undefined, '', '  '])('is unknown when the scope is %p', async (scope) => {
    expect(await loadScope(scope)).toBe('unknown');
  });
});

describe('elasticCloudTargetFromEnv', () => {
  const VARS = [
    'SCOUT_TARGET_ELASTIC_CLOUD_PROJECT_ID',
    'SCOUT_TARGET_ELASTIC_CLOUD_DEPLOYMENT_ID',
    'SCOUT_TARGET_ELASTIC_CLOUD_REGION',
    'SCOUT_TARGET_ELASTIC_CLOUD_ENVIRONMENT',
  ] as const;
  const original = Object.fromEntries(VARS.map((name) => [name, process.env[name]]));

  const setEnv = (values: Partial<Record<(typeof VARS)[number], string>>) => {
    for (const name of VARS) {
      const value = values[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  };

  afterEach(() => {
    setEnv(original);
  });

  it('records the serverless project, its region and its environment', () => {
    setEnv({
      SCOUT_TARGET_ELASTIC_CLOUD_PROJECT_ID: ' 3f1c9a ',
      SCOUT_TARGET_ELASTIC_CLOUD_REGION: 'azure-eastus2',
      SCOUT_TARGET_ELASTIC_CLOUD_ENVIRONMENT: 'qa',
    });

    expect(elasticCloudTargetFromEnv()).toEqual({
      project: { id: '3f1c9a' },
      region: 'azure-eastus2',
      environment: 'qa',
    });
  });

  it('records the hosted deployment', () => {
    setEnv({ SCOUT_TARGET_ELASTIC_CLOUD_DEPLOYMENT_ID: 'b72e04' });

    expect(elasticCloudTargetFromEnv()).toEqual({ deployment: { id: 'b72e04' } });
  });

  it('is undefined without a project or deployment ID, even with a region and environment', () => {
    setEnv({
      SCOUT_TARGET_ELASTIC_CLOUD_PROJECT_ID: ' ',
      SCOUT_TARGET_ELASTIC_CLOUD_REGION: 'azure-eastus2',
      SCOUT_TARGET_ELASTIC_CLOUD_ENVIRONMENT: 'qa',
    });

    expect(elasticCloudTargetFromEnv()).toBeUndefined();
  });
});
