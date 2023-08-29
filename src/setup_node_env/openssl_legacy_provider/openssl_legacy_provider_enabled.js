/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = function () {
  var nodeOptions = process.env.NODE_OPTIONS
    ? process.env.NODE_OPTIONS.split(' ').filter(Boolean)
    : [];
  var execOptions = process.execArgv;

  var cliOpenSSLLegacyProvider = checkOpenSSLLegacyProvider(execOptions);
  var envOpenSSLLegacyProvider = checkOpenSSLLegacyProvider(nodeOptions);

  if (typeof cliOpenSSLLegacyProvider === 'boolean') return cliOpenSSLLegacyProvider;
  return Boolean(envOpenSSLLegacyProvider);
};

function checkOpenSSLLegacyProvider(options) {
  var openSSLLegacyProvider = null;
  options.forEach(function (option) {
    if (option === '--openssl-legacy-provider') {
      openSSLLegacyProvider = true;
    }
    if (option === '--no-openssl-legacy-provider') {
      openSSLLegacyProvider = false;
    }
  });
  return openSSLLegacyProvider;
}
