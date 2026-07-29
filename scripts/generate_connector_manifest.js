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
 * Regenerates the connector release manifest committed at:
 *   src/platform/packages/shared/kbn-connector-specs/connector_release_manifest.json
 *
 * Run after adding or modifying connector specs:
 *   node scripts/generate_connector_manifest
 *
 * The manifest records each connector's id and its supportedFeatureIds. It is the
 * input for the advisory 2-step release check, which ensures a brand-new connector
 * type reaches a shipped release before it declares user-facing features.
 * Commit the updated file together with the spec changes.
 */

require('@kbn/setup-node-env');

var fs = require('fs');
var path = require('path');
var allSpecs = require('@kbn/connector-specs/src/all_specs');

var MANIFEST_PATH = path.join(
  __dirname,
  '../src/platform/packages/shared/kbn-connector-specs/connector_release_manifest.json'
);

var connectors = Object.values(allSpecs)
  .map(function (spec) {
    return {
      id: spec.metadata.id,
      supportedFeatureIds: [].concat(spec.metadata.supportedFeatureIds).sort(),
    };
  })
  .sort(function (a, b) {
    return a.id.localeCompare(b.id);
  });

var manifest = { schemaVersion: '1', connectors: connectors };
var content = JSON.stringify(manifest, null, 2) + '\n';

fs.writeFileSync(MANIFEST_PATH, content, 'utf8');
// eslint-disable-next-line no-console
console.log('Wrote ' + connectors.length + ' connectors to ' + MANIFEST_PATH);
