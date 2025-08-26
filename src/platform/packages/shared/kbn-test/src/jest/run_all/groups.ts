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
export interface JestUnitGroup {
  name: string;
  patterns: string[];
}

export const UNIT_TEST_GROUPS: JestUnitGroup[] = [
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
    name: 'Onechat',
    patterns: ['x-pack/solutions/chat/**/jest.config.js'],
  },
  {
    name: 'Search',
    patterns: ['x-pack/solutions/search/**/jest.config.js'],
  },
];
