/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_SERVERLESS_SUPERUSER, ELASTIC_SERVERLESS_SUPERUSER_PASSWORD } from '@kbn/es';

import { getEisDevEsConnection } from './eis_dev_orchestrator';

describe('getEisDevEsConnection', () => {
  const originalEnv = {
    KBN_EIS_ES_HOST: process.env.KBN_EIS_ES_HOST,
    KBN_EIS_ES_USERNAME: process.env.KBN_EIS_ES_USERNAME,
    KBN_EIS_ES_PASSWORD: process.env.KBN_EIS_ES_PASSWORD,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  beforeEach(() => {
    delete process.env.KBN_EIS_ES_HOST;
    delete process.env.KBN_EIS_ES_USERNAME;
    delete process.env.KBN_EIS_ES_PASSWORD;
  });

  it('uses stateful defaults', () => {
    expect(getEisDevEsConnection()).toEqual({
      baseUrl: 'http://localhost:9200',
      credentials: { username: 'elastic', password: 'changeme' },
      ssl: false,
    });
  });

  it('uses serverless defaults', () => {
    expect(getEisDevEsConnection({ serverless: true })).toEqual({
      baseUrl: 'https://localhost:9200',
      credentials: {
        username: ELASTIC_SERVERLESS_SUPERUSER,
        password: ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
      },
      ssl: true,
    });
  });

  it('lets env vars override serverless defaults', () => {
    process.env.KBN_EIS_ES_HOST = 'https://127.0.0.1:9201';
    process.env.KBN_EIS_ES_USERNAME = 'custom';
    process.env.KBN_EIS_ES_PASSWORD = 'secret';

    expect(getEisDevEsConnection({ serverless: true })).toEqual({
      baseUrl: 'https://127.0.0.1:9201',
      credentials: { username: 'custom', password: 'secret' },
      ssl: true,
    });
  });
});
