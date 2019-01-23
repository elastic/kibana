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

import _ from 'lodash';
import { readFileSync } from 'fs';
import http from 'http';
import https from 'https';
import url from 'url';

const readFile = (file) => readFileSync(file, 'utf8');

const createAgent = (bwcConfig) => {
  const target = url.parse(_.head(bwcConfig.hosts));
  if (!/^https/.test(target.protocol)) return new http.Agent();

  const agentOptions = {};

  const verificationMode = bwcConfig.ssl && bwcConfig.ssl.verificationMode;
  switch (verificationMode) {
    case 'none':
      agentOptions.rejectUnauthorized = false;
      break;
    case 'certificate':
      agentOptions.rejectUnauthorized = true;

      // by default, NodeJS is checking the server identify
      agentOptions.checkServerIdentity = _.noop;
      break;
    case 'full':
      agentOptions.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  if (bwcConfig.ssl && bwcConfig.ssl.certificateAuthorities.length > 0) {
    agentOptions.ca = bwcConfig.ssl.certificateAuthorities.map(readFile);
  }

  if (
    bwcConfig.ssl &&
    bwcConfig.ssl.alwaysPresentCertificate &&
    bwcConfig.ssl.certificate &&
    bwcConfig.ssl.key
  ) {
    agentOptions.cert = readFile(bwcConfig.ssl.certificate);
    agentOptions.key = readFile(bwcConfig.ssl.key);
    agentOptions.passphrase = bwcConfig.ssl.keyPassphrase;
  }

  return new https.Agent(agentOptions);
};

export const getElasticsearchProxyConfig = (bwcConfig) => {
  return {
    timeout: bwcConfig.requestTimeout.asMilliseconds(),
    agent: createAgent(bwcConfig)
  };
};
