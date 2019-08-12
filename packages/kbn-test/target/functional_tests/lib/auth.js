"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setupUsers = setupUsers;
exports.DEFAULT_SUPERUSER_PASS = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _util = _interopRequireDefault(require("util"));

var _url = require("url");

var _request = _interopRequireDefault(require("request"));

var _bluebird = require("bluebird");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const DEFAULT_SUPERUSER_PASS = 'changeme';
exports.DEFAULT_SUPERUSER_PASS = DEFAULT_SUPERUSER_PASS;

const readFile = _util.default.promisify(_fs.default.readFile);

async function updateCredentials({
  port,
  auth,
  username,
  password,
  retries = 10,
  protocol,
  caCert
}) {
  const result = await new Promise((resolve, reject) => (0, _request.default)({
    method: 'PUT',
    uri: (0, _url.format)({
      protocol: `${protocol}:`,
      auth,
      hostname: 'localhost',
      port,
      pathname: `/_security/user/${username}/_password`
    }),
    json: true,
    body: {
      password
    },
    ca: caCert
  }, (err, httpResponse, body) => {
    if (err) return reject(err);
    resolve({
      httpResponse,
      body
    });
  }));
  const {
    body,
    httpResponse
  } = result;
  const {
    statusCode
  } = httpResponse;

  if (statusCode === 200) {
    return;
  }

  if (retries > 0) {
    await (0, _bluebird.delay)(2500);
    return await updateCredentials({
      port,
      auth,
      username,
      password,
      retries: retries - 1,
      protocol,
      caCert
    });
  }

  throw new Error(`${statusCode} response, expected 200 -- ${JSON.stringify(body)}`);
}

async function setupUsers({
  log,
  esPort,
  updates,
  protocol = 'http',
  caPath
}) {
  // track the current credentials for the `elastic` user as
  // they will likely change as we apply updates
  let auth = `elastic:${DEFAULT_SUPERUSER_PASS}`;
  const caCert = caPath && (await readFile(caPath));

  for (const {
    username,
    password,
    roles
  } of updates) {
    // If working with a built-in user, just change the password
    if (['logstash_system', 'elastic', 'kibana'].includes(username)) {
      await updateCredentials({
        port: esPort,
        auth,
        username,
        password,
        protocol,
        caCert
      });
      log.info('setting %j user password to %j', username, password); // If not a builtin user, add them
    } else {
      await insertUser({
        port: esPort,
        auth,
        username,
        password,
        roles,
        protocol,
        caCert
      });
      log.info('Added %j user with password to %j', username, password);
    }

    if (username === 'elastic') {
      auth = `elastic:${password}`;
    }
  }
}

async function insertUser({
  port,
  auth,
  username,
  password,
  roles = [],
  retries = 10,
  protocol,
  caCert
}) {
  const result = await new Promise((resolve, reject) => (0, _request.default)({
    method: 'POST',
    uri: (0, _url.format)({
      protocol: `${protocol}:`,
      auth,
      hostname: 'localhost',
      port,
      pathname: `/_security/user/${username}`
    }),
    json: true,
    body: {
      password,
      roles
    },
    ca: caCert
  }, (err, httpResponse, body) => {
    if (err) return reject(err);
    resolve({
      httpResponse,
      body
    });
  }));
  const {
    body,
    httpResponse
  } = result;
  const {
    statusCode
  } = httpResponse;

  if (statusCode === 200) {
    return;
  }

  if (retries > 0) {
    await (0, _bluebird.delay)(2500);
    return await insertUser({
      port,
      auth,
      username,
      password,
      roles,
      retries: retries - 1,
      protocol,
      caCert
    });
  }

  throw new Error(`${statusCode} response, expected 200 -- ${JSON.stringify(body)}`);
}