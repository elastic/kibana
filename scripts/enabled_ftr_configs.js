/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');

var yaml = require('js-yaml');
var fs = require('fs');

try {
  var configs = yaml.load(fs.readFileSync('.buildkite/ftr_configs.yml', 'utf8'));
  var enabledConfigs = [].concat(
    configs.enabled_stateful,
    configs.enabled_serverless_search,
    configs.enabled_serverless_security,
    configs.enabled_serverless_observability
  );
  enabledConfigs.forEach(function (x) {
    console.log(x);
  });
} catch (e) {
  console.log(e);
}
