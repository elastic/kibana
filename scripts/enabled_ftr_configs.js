/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../src/setup_node_env');

var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');

var manifestsJsonPath = path.resolve(__dirname, '../.buildkite/ftr_configs_manifests.json');
console.log(manifestsJsonPath);
var manifestsSource = JSON.parse(fs.readFileSync(manifestsJsonPath, 'utf8'));
var allManifestPaths = Object.values(manifestsSource).flat();

try {
  for (var manifestRelPath of allManifestPaths) {
    var manifest = yaml.load(fs.readFileSync(manifestRelPath, 'utf8'));
    if (manifest.enabled) {
      manifest.enabled.forEach(function (x) {
        console.log(x);
      });
    } else {
      console.log(`${manifestRelPath} has no enabled FTR configs`);
    }
  }
} catch (e) {
  console.log(e);
}
