/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import http from 'http';
import https from 'https';
import url from 'url';

import { ESConfigForProxy } from '../types';

const createAgent = (legacyConfig: ESConfigForProxy) => {
  const target = url.parse(_.head(legacyConfig.hosts)!);
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
      agentOptions.checkServerIdentity =
        _.noop as unknown as https.AgentOptions['checkServerIdentity'];
      break;
    case 'full':
      agentOptions.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  agentOptions.ca = legacyConfig.ssl?.certificateAuthorities;

  const ignoreCertAndKey = !legacyConfig.ssl?.alwaysPresentCertificate;
  if (!ignoreCertAndKey && legacyConfig.ssl?.certificate && legacyConfig.ssl?.key) {
    agentOptions.cert = legacyConfig.ssl.certificate;
    agentOptions.key = legacyConfig.ssl.key;
    agentOptions.passphrase = legacyConfig.ssl.keyPassphrase;
  }

  return new https.Agent(agentOptions);
};

export const getElasticsearchProxyConfig = (legacyConfig: ESConfigForProxy) => {
  return {
    timeout: legacyConfig.requestTimeout.asMilliseconds(),
    agent: createAgent(legacyConfig),
  };
};
