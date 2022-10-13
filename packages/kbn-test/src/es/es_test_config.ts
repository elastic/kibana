/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { kibanaPackageJson as pkg } from '@kbn/utils';
import Url from 'url';
import { systemIndicesSuperuser } from '../kbn';

class EsTestConfig {
  getVersion() {
    return process.env.TEST_ES_BRANCH || pkg.version;
  }

  getPort() {
    return this.getUrlParts().port;
  }

  getUrl() {
    return Url.format(this.getUrlParts());
  }

  getBuildFrom() {
    return process.env.TEST_ES_FROM || 'snapshot';
  }

  getTransportPort() {
    return process.env.TEST_ES_TRANSPORT_PORT || '9300-9400';
  }

  getUrlParts() {
    // Allow setting one complete TEST_ES_URL for Es like https://elastic:changeme@myCloudInstance:9200
    if (process.env.TEST_ES_URL) {
      const testEsUrl = Url.parse(process.env.TEST_ES_URL);
      if (!testEsUrl.port) {
        throw new Error(
          `process.env.TEST_ES_URL must contain port. given: ${process.env.TEST_ES_URL}`
        );
      }
      return {
        // have to remove the ":" off protocol
        protocol: testEsUrl.protocol?.slice(0, -1),
        hostname: testEsUrl.hostname,
        port: parseInt(testEsUrl.port, 10),
        username: testEsUrl.auth?.split(':')[0],
        password: testEsUrl.auth?.split(':')[1],
        auth: testEsUrl.auth,
      };
    }

    const username = process.env.TEST_ES_USERNAME || systemIndicesSuperuser.username;
    const password = process.env.TEST_ES_PASSWORD || systemIndicesSuperuser.password;

    const port = process.env.TEST_ES_PORT ? parseInt(process.env.TEST_ES_PORT, 10) : 9220;

    if (Number.isNaN(port)) {
      throw new Error(
        `process.env.TEST_ES_PORT must contain a valid port. given: ${process.env.TEST_ES_PORT}`
      );
    }

    return {
      // Allow setting any individual component(s) of the URL,
      // or use default values (username and password from ../kbn/users.js)
      protocol: process.env.TEST_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_ES_HOSTNAME || 'localhost',
      port,
      auth: `${username}:${password}`,
      username,
      password,
    };
  }
}

export const esTestConfig = new EsTestConfig();
