/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import url from 'url';
import { kibanaTestUser } from './users';

interface UrlParts {
  protocol?: string;
  hostname?: string;
  port?: number;
  auth?: string;
  username?: string;
  password?: string;
}

export const kbnTestConfig = new (class KbnTestConfig {
  getPort() {
    return this.getUrlParts().port;
  }

  getUrlParts(): UrlParts {
    // allow setting one complete TEST_KIBANA_URL for ES like https://elastic:changeme@example.com:9200
    if (process.env.TEST_KIBANA_URL) {
      const testKibanaUrl = url.parse(process.env.TEST_KIBANA_URL);
      return {
        protocol: testKibanaUrl.protocol?.slice(0, -1),
        hostname: testKibanaUrl.hostname === null ? undefined : testKibanaUrl.hostname,
        port: testKibanaUrl.port ? parseInt(testKibanaUrl.port, 10) : undefined,
        auth: testKibanaUrl.auth === null ? undefined : testKibanaUrl.auth,
        username: testKibanaUrl.auth?.split(':')[0],
        password: testKibanaUrl.auth?.split(':')[1],
      };
    }

    const username = process.env.TEST_KIBANA_USERNAME || kibanaTestUser.username;
    const password = process.env.TEST_KIBANA_PASSWORD || kibanaTestUser.password;
    return {
      protocol: process.env.TEST_KIBANA_PROTOCOL || 'http',
      hostname: process.env.TEST_KIBANA_HOSTNAME || 'localhost',
      port: process.env.TEST_KIBANA_PORT ? parseInt(process.env.TEST_KIBANA_PORT, 10) : 5620,
      auth: `${username}:${password}`,
      username,
      password,
    };
  }
})();
