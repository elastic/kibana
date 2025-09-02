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
 * Jest unit test groups and their glob patterns.
 * The script at scripts/get_jest_unit_groups reads this file and prints JSON for CI to consume.
 */

/**
 * @typedef {Object} JestUnitGroup
 * @property {string} name - Display name of the group.
 * @property {string[]} patterns - Glob patterns that select configs/files for this group.
 */

/** @type {JestUnitGroup[]} */
var UNIT_TEST_GROUPS = [
  {
    name: 'OSS',
    patterns: ['src/**/jest.config.js', 'packages/**/jest.config.js', 'examples/**/jest.config.js'],
  },
  {
    name: 'Platform X-Pack',
    patterns: [
      'x-pack/{build_chromium,dev-tools,examples,packages,performance,platform,scripts,test,test_serverless}/**/jest.config.js',
    ],
  },
  {
    name: 'Observability',
    patterns: ['x-pack/solutions/observability/**/jest.config.js'],
  },
  {
    name: 'Security Solution',
    patterns: ['x-pack/solutions/security/**/jest.config.js'],
  },
  {
    name: 'Onechat & Search',
    patterns: ['x-pack/solutions/{chat,search}/**/jest.config.js'],
  },
];

module.exports = { UNIT_TEST_GROUPS };

function main() {
  var output = {
    groups: UNIT_TEST_GROUPS.map(function (g) {
      return { name: g.name, patterns: g.patterns };
    }),
  };

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main();
