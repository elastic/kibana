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

import util from 'util';
import url from 'url';
import { get, noop, size, pick } from 'lodash';
import { readFileSync } from 'fs';
import Bluebird from 'bluebird';

const readFile = (file) => readFileSync(file, 'utf8');

export function parseConfig(serverConfig = {}, { ignoreCertAndKey = false } = {}) {
  const config = {
    keepAlive: true,
    ...pick(serverConfig, [
      'plugins', 'apiVersion', 'keepAlive', 'pingTimeout',
      'requestTimeout', 'log', 'logQueries'
    ])
  };

  const uri = url.parse(serverConfig.url);
  const httpsURI = uri.protocol === 'https:';
  const httpURI = uri.protocol === 'http:';
  const protocolPort = httpsURI && '443' || httpURI && '80';
  config.host = {
    host: uri.hostname,
    port: uri.port || protocolPort,
    protocol: uri.protocol,
    path: uri.pathname,
    query: uri.query,
    headers: serverConfig.customHeaders
  };

  // Auth
  if (serverConfig.auth !== false && serverConfig.username && serverConfig.password) {
    config.host.auth = util.format('%s:%s', serverConfig.username, serverConfig.password);
  }

  // SSL
  config.ssl = {};

  const verificationMode = get(serverConfig, 'ssl.verificationMode');
  switch (verificationMode) {
    case 'none':
      config.ssl.rejectUnauthorized = false;
      break;
    case 'certificate':
      config.ssl.rejectUnauthorized = true;

      // by default, NodeJS is checking the server identify
      config.ssl.checkServerIdentity = noop;
      break;
    case 'full':
      config.ssl.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  if (size(get(serverConfig, 'ssl.certificateAuthorities'))) {
    config.ssl.ca = serverConfig.ssl.certificateAuthorities.map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (!ignoreCertAndKey && get(serverConfig, 'ssl.certificate') && get(serverConfig, 'ssl.key')) {
    config.ssl.cert = readFile(serverConfig.ssl.certificate);
    config.ssl.key = readFile(serverConfig.ssl.key);
    config.ssl.passphrase = serverConfig.ssl.keyPassphrase;
  }

  config.defer = () => Bluebird.defer();

  return config;
}
