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

import { kibanaTestUser } from './users';
import url from 'url';

export const kbnTestConfig = new (class KbnTestConfig {
  getPort() {
    return this.getUrlParts().port;
  }

  getUrlParts() {
    // allow setting one complete TEST_KIBANA_URL for ES like https://elastic:changeme@example.com:9200
    if (process.env.TEST_KIBANA_URL) {
      const testKibanaUrl = url.parse(process.env.TEST_KIBANA_URL);
      return {
        protocol: testKibanaUrl.protocol.slice(0, -1),
        hostname: testKibanaUrl.hostname,
        port: parseInt(testKibanaUrl.port, 10),
        auth: testKibanaUrl.auth,
        username: testKibanaUrl.auth.split(':')[0],
        password: testKibanaUrl.auth.split(':')[1],
      };
    }

    const username = process.env.TEST_KIBANA_USERNAME || kibanaTestUser.username;
    const password = process.env.TEST_KIBANA_PASSWORD || kibanaTestUser.password;
    return {
      protocol: process.env.TEST_KIBANA_PROTOCOL || 'http',
      hostname: process.env.TEST_KIBANA_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_KIBANA_PORT, 10) || 5620,
      auth: `${username}:${password}`,
      username,
      password,
    };
  }
})();
