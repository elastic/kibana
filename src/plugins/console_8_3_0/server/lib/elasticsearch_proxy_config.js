/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.getElasticsearchProxyConfig = void 0;

const _lodash = _interopRequireDefault(require('lodash'));

const _http = _interopRequireDefault(require('http'));

const _https = _interopRequireDefault(require('https'));

const _url = _interopRequireDefault(require('url'));

const createAgent = (legacyConfig) => {
  let _legacyConfig$ssl;
  let _legacyConfig$ssl2;
  let _legacyConfig$ssl3;
  let _legacyConfig$ssl4;

  const target = _url.default.parse(_lodash.default.head(legacyConfig.hosts));

  if (!/^https/.test(target.protocol || '')) return new _http.default.Agent();
  const agentOptions = {};
  const verificationMode = legacyConfig.ssl && legacyConfig.ssl.verificationMode;

  switch (verificationMode) {
    case 'none':
      agentOptions.rejectUnauthorized = false;
      break;

    case 'certificate':
      agentOptions.rejectUnauthorized = true; // by default, NodeJS is checking the server identify

      agentOptions.checkServerIdentity = _lodash.default.noop;
      break;

    case 'full':
      agentOptions.rejectUnauthorized = true;
      break;

    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  agentOptions.ca =
    (_legacyConfig$ssl = legacyConfig.ssl) === null || _legacyConfig$ssl === void 0
      ? void 0
      : _legacyConfig$ssl.certificateAuthorities;
  const ignoreCertAndKey = !(
    (_legacyConfig$ssl2 = legacyConfig.ssl) !== null &&
    _legacyConfig$ssl2 !== void 0 &&
    _legacyConfig$ssl2.alwaysPresentCertificate
  );

  if (
    !ignoreCertAndKey &&
    (_legacyConfig$ssl3 = legacyConfig.ssl) !== null &&
    _legacyConfig$ssl3 !== void 0 &&
    _legacyConfig$ssl3.certificate &&
    (_legacyConfig$ssl4 = legacyConfig.ssl) !== null &&
    _legacyConfig$ssl4 !== void 0 &&
    _legacyConfig$ssl4.key
  ) {
    agentOptions.cert = legacyConfig.ssl.certificate;
    agentOptions.key = legacyConfig.ssl.key;
    agentOptions.passphrase = legacyConfig.ssl.keyPassphrase;
  }

  return new _https.default.Agent(agentOptions);
};

const getElasticsearchProxyConfig = (legacyConfig) => {
  return {
    timeout: legacyConfig.requestTimeout.asMilliseconds(),
    agent: createAgent(legacyConfig),
  };
};

exports.getElasticsearchProxyConfig = getElasticsearchProxyConfig;
