/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const convert = require('./convert');

const clusterHealthSpec = require('../test/fixtures/cluster_health_spec');
const clusterHealthAutocomplete = require('../test/fixtures/cluster_health_autocomplete');

test('convert', () => {
  expect(convert(clusterHealthSpec)).toEqual(clusterHealthAutocomplete);
});
