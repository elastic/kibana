/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const convert = require('./convert');

const clusterHealthSpec = require('./__fixtures__/cluster_health_spec.json');
const clusterHealthAutocomplete = require('./__fixtures__/cluster_health_autocomplete.json');

const snapshotGetSpec = require('./__fixtures__/snapshot_get_spec.json');
const snapshotGetAutocomplete = require('./__fixtures__/snapshot_get_autocomplete.json');

test('convert', () => {
  expect(convert(clusterHealthSpec)).toEqual(clusterHealthAutocomplete);
  expect(convert(snapshotGetSpec)).toEqual(snapshotGetAutocomplete);
});
