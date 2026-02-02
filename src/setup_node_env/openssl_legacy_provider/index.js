/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var pkg =
  __filename.indexOf('node_modules') === -1
    ? // when running from src/
      require('../../../package.json')
    : // when installed as a package
      // eslint-disable-next-line @kbn/imports/no_unresolvable_imports
      require('../../../../package.json');
var branch = pkg && pkg.branch;
var docsBranch = branch.match(/^\d\.\d\d?$/) || 'current';
var openSSLLegacyProviderEnabled = require('./openssl_legacy_provider_enabled')();

if (openSSLLegacyProviderEnabled) {
  console.log(
    'Kibana is currently running with legacy OpenSSL providers enabled! For details and instructions on how to disable see https://www.elastic.co/guide/en/kibana/' +
      docsBranch +
      '/production.html#openssl-legacy-provider'
  );
}
