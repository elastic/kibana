#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Regenerates the connector execution manifest committed at:
 *   src/platform/packages/shared/kbn-connector-specs/connector_execution_manifest.json
 *
 * Run after adding or modifying connector specs:
 *   node scripts/generate_connector_manifest
 *
 * The committed manifest is the input for the two-step release gate CI check.
 * Commit the updated file together with the spec changes.
 */

require('@kbn/setup-node-env');

var fs = require('fs');
var path = require('path');
var allSpecs = require('@kbn/connector-specs/src/all_specs');
var manifestLib = require('@kbn/connector-specs/src/lib/connector_execution_manifest');

var MANIFEST_PATH = path.join(
  __dirname,
  '../src/platform/packages/shared/kbn-connector-specs/connector_execution_manifest.json'
);

var specs = Object.values(allSpecs);
var manifest = manifestLib.buildConnectorManifest(specs);
var content = JSON.stringify(manifest, null, 2) + '\n';

fs.writeFileSync(MANIFEST_PATH, content, 'utf8');
// eslint-disable-next-line no-console
console.log('Wrote ' + manifest.connectors.length + ' connectors to ' + MANIFEST_PATH);
