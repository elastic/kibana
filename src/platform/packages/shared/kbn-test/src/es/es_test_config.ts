/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import Url from 'url';
import { TEST_ES_PORT, TEST_ES_TRANSPORT_PORT } from '@kbn/test-services';
import { systemIndicesSuperuser } from '../kbn';
import { getUrlParts } from '../get_url_parts';

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

  getESServerlessImage() {
    return process.env.TEST_ES_SERVERLESS_IMAGE;
  }

  getTransportPort() {
    return TEST_ES_TRANSPORT_PORT;
  }

  getUrlParts() {
    // Allow setting one complete TEST_ES_URL for Es like https://elastic:changeme@myCloudInstance:9200
    if (process.env.TEST_ES_URL) {
      const testEsUrlParts = getUrlParts(process.env.TEST_ES_URL);
      return testEsUrlParts;
    }

    const username = process.env.TEST_ES_USERNAME || systemIndicesSuperuser.username;
    const password = process.env.TEST_ES_PASSWORD || systemIndicesSuperuser.password;

    const port = TEST_ES_PORT;

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
