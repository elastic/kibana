/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const manifestsJsonPath = path.resolve(__dirname, '../.buildkite/ftr_configs_manifests.json');
console.log(manifestsJsonPath);
const manifestsSource = JSON.parse(fs.readFileSync(manifestsJsonPath, 'utf8'));
const allManifestPaths = Object.values(manifestsSource).flat();

try {
  for (const manifestRelPath of allManifestPaths) {
    const manifest = yaml.load(fs.readFileSync(manifestRelPath, 'utf8'));
    if (manifest.enabled) {
      manifest.enabled.forEach(function (x: unknown) {
        console.log(x);
      });
    } else {
      console.log(`${manifestRelPath} has no enabled FTR configs`);
    }
  }
} catch (e) {
  console.log(e);
}
