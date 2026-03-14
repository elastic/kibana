/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kbnTestConfig } from './kbn_test_config';

describe('kbnTestConfig', () => {
  const originalTestKibanaUrl = process.env.TEST_KIBANA_URL;

  afterEach(() => {
    if (originalTestKibanaUrl === undefined) {
      delete process.env.TEST_KIBANA_URL;
    } else {
      process.env.TEST_KIBANA_URL = originalTestKibanaUrl;
    }
  });

  it('parses TEST_KIBANA_URL with credentials', () => {
    process.env.TEST_KIBANA_URL = 'https://elastic:changeme@example.com:9200';

    expect(kbnTestConfig.getUrlParts()).toEqual({
      protocol: 'https',
      hostname: 'example.com',
      port: 9200,
      auth: 'elastic:changeme',
      username: 'elastic',
      password: 'changeme',
    });
  });
});
