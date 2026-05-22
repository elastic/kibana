/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleGenerationExample } from '../types';

export const ROLE_GENERATION_DATASET_NAME = 'Mock IdP Role Generation';
export const ROLE_GENERATION_DATASET_DESCRIPTION =
  'Evaluation dataset for the Mock IdP AI role generation feature.';

export const roleGenerationExamples: RoleGenerationExample[] = [
  {
    input: { description: 'Read-only access to all features in all spaces' },
    output: {
      roleName: '',
      kibana: [{ id: 'base', access: 'read', space: '*' }],
      elasticsearch: [],
      accessToSystemIndices: 'none',
    },
    metadata: {
      criteria: [
        'The kibana array contains an entry with id "base", access "read", and space "*"',
        'The elasticsearch array is empty',
        'accessToSystemIndices is "none"',
      ],
    },
  },
  {
    input: { description: 'Full access to dashboards in space_a' },
    output: {
      roleName: '',
      kibana: [{ id: 'dashboard', access: 'all', space: 'space_a' }],
      elasticsearch: [],
      accessToSystemIndices: 'none',
    },
    metadata: {
      criteria: [
        'The kibana array contains an entry with id "dashboard", access "all", and space "space_a"',
        'The role does NOT grant access to any other spaces',
      ],
    },
  },
  {
    input: {
      description: 'Read access to discover and dashboard in the default space',
    },
    output: {
      roleName: '',
      kibana: [
        { id: 'discover', access: 'read', space: 'default' },
        { id: 'dashboard', access: 'read', space: 'default' },
      ],
      elasticsearch: [],
      accessToSystemIndices: 'none',
    },
    metadata: {
      criteria: [
        'The kibana array contains entries for both "discover" and "dashboard" with access "read"',
        'All kibana entries have space "default"',
      ],
    },
  },
  {
    input: { description: 'Write access to all Elasticsearch indices' },
    output: {
      roleName: '',
      kibana: [],
      elasticsearch: [{ index: '*', access: 'all' }],
      accessToSystemIndices: 'none',
    },
    metadata: {
      criteria: [
        'The elasticsearch array contains an entry with index "*" and access "all"',
        'The kibana array is empty',
      ],
    },
  },
  {
    input: {
      description:
        'Read-only access to all features in all spaces, write access to dashboards in space_a and space_b',
    },
    output: {
      roleName: '',
      kibana: [
        { id: 'base', access: 'read', space: '*' },
        { id: 'dashboard', access: 'all', space: 'space_a' },
        { id: 'dashboard', access: 'all', space: 'space_b' },
      ],
      elasticsearch: [],
      accessToSystemIndices: 'none',
    },
    metadata: {
      criteria: [
        'The kibana array contains a "base" read entry for all spaces ("*")',
        'The kibana array contains "dashboard" all entries for both "space_a" and "space_b"',
      ],
    },
  },
];
