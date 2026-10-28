/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esTestConfig } from './es_test_config';

describe('esTestConfig.getUrlParts()', () => {
  const testEsUrl = process.env.TEST_ES_URL;

  afterEach(() => {
    if (testEsUrl === undefined) {
      delete process.env.TEST_ES_URL;
    } else {
      process.env.TEST_ES_URL = testEsUrl;
    }
  });

  it('takes the credentials from TEST_ES_URL', () => {
    process.env.TEST_ES_URL = 'https://elastic:changeme@localhost:9200';

    expect(esTestConfig.getUrlParts()).toEqual({
      protocol: 'https',
      hostname: 'localhost',
      port: 9200,
      username: 'elastic',
      password: 'changeme',
      auth: 'elastic:changeme',
    });
  });

  it('leaves the credentials out when TEST_ES_URL has none', () => {
    process.env.TEST_ES_URL = 'http://localhost:9200';

    expect(esTestConfig.getUrlParts()).toEqual({
      protocol: 'http',
      hostname: 'localhost',
      port: 9200,
      username: undefined,
      password: undefined,
      auth: undefined,
    });
  });
});
