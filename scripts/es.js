/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');

var resolve = require('path').resolve;
var pkg = require('../package.json');
var kbnEs = require('@kbn/es');

kbnEs
  .run({
    license: 'basic',
    password: 'changeme',
    version: pkg.version,
    'source-path': resolve(__dirname, '../../elasticsearch'),
    'base-path': resolve(__dirname, '../.es'),
    ssl: false,
  })
  .catch(function (e) {
    console.error(e);
    process.exitCode = 1;
  });
