"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.esTestConfig = void 0;

var _url = _interopRequireWildcard(require("url"));

var _package = _interopRequireDefault(require("../../../../package.json"));

var _kbn = require("../kbn");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
const esTestConfig = new class EsTestConfig {
  getVersion() {
    return process.env.TEST_ES_BRANCH || _package.default.version;
  }

  getPort() {
    return this.getUrlParts().port;
  }

  getUrl() {
    return (0, _url.format)(this.getUrlParts());
  }

  getBuildFrom() {
    return process.env.TEST_ES_FROM || 'snapshot';
  }

  getUrlParts() {
    // Allow setting one complete TEST_ES_URL for Es like https://elastic:changeme@myCloudInstance:9200
    if (process.env.TEST_ES_URL) {
      const testEsUrl = _url.default.parse(process.env.TEST_ES_URL);

      return {
        // have to remove the ":" off protocol
        protocol: testEsUrl.protocol.slice(0, -1),
        hostname: testEsUrl.hostname,
        port: parseInt(testEsUrl.port, 10),
        username: testEsUrl.auth.split(':')[0],
        password: testEsUrl.auth.split(':')[1],
        auth: testEsUrl.auth
      };
    }

    const username = process.env.TEST_ES_USERNAME || _kbn.adminTestUser.username;
    const password = process.env.TEST_ES_PASSWORD || _kbn.adminTestUser.password;
    return {
      // Allow setting any individual component(s) of the URL,
      // or use default values (username and password from ../kbn/users.js)
      protocol: process.env.TEST_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_ES_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_ES_PORT, 10) || 9220,
      auth: `${username}:${password}`,
      username: username,
      password: password
    };
  }

}();
exports.esTestConfig = esTestConfig;