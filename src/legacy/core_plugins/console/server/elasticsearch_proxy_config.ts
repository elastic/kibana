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
import { readPkcs12Keystore, readPkcs12Truststore } from '../../../../core/utils';

const readFile = (file: string) => readFileSync(file, 'utf8');

const createAgent = (legacyConfig: any): http.Agent | https.Agent => {
  const target = url.parse(_.head(legacyConfig.hosts));
  if (!/^https/.test(target.protocol || '')) return new http.Agent();

  const agentOptions: https.AgentOptions = {};

  const verificationMode = legacyConfig.ssl && legacyConfig.ssl.verificationMode;
  switch (verificationMode) {
    case 'none':
      agentOptions.rejectUnauthorized = false;
      break;
    case 'certificate':
      agentOptions.rejectUnauthorized = true;

      // by default, NodeJS is checking the server identify
      agentOptions.checkServerIdentity = _.noop as any;
      break;
    case 'full':
      agentOptions.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  const ignoreCertAndKey = !legacyConfig.ssl?.alwaysPresentCertificate;

  let certificateAuthorities: string[] | undefined;
  const addCAs = (ca: string[] | undefined) => {
    if (ca && ca.length) {
      certificateAuthorities = certificateAuthorities ? certificateAuthorities.concat(ca) : ca;
    }
  };

  if (legacyConfig.ssl.keystore?.path) {
    const { key, cert, ca } = readPkcs12Keystore(
      legacyConfig.ssl.keystore.path,
      legacyConfig.ssl.keystore.password
    );
    if (!ignoreCertAndKey) {
      agentOptions.key = key;
      agentOptions.cert = cert;
    }
    addCAs(ca);
  } else if (!ignoreCertAndKey && legacyConfig.ssl?.certificate && legacyConfig.ssl?.key) {
    agentOptions.cert = readFile(legacyConfig.ssl.certificate);
    agentOptions.key = readFile(legacyConfig.ssl.key);
    agentOptions.passphrase = legacyConfig.ssl.keyPassphrase;
  }

  if (legacyConfig.ssl.truststore?.path) {
    const ca = readPkcs12Truststore(
      legacyConfig.ssl.truststore.path,
      legacyConfig.ssl.truststore.password
    );
    addCAs(ca);
  }

  const ca = legacyConfig.ssl?.certificateAuthorities;
  if (ca) {
    const parsed = [];
    const paths = Array.isArray(ca) ? ca : [ca];
    if (paths.length > 0) {
      for (const path of paths) {
        parsed.push(readFile(path));
      }
      addCAs(parsed);
    }
  }

  agentOptions.ca = certificateAuthorities;

  return new https.Agent(agentOptions);
};

export const getElasticsearchProxyConfig = (legacyConfig: any) => {
  return {
    timeout: legacyConfig.requestTimeout.asMilliseconds(),
    agent: createAgent(legacyConfig),
  };
};
