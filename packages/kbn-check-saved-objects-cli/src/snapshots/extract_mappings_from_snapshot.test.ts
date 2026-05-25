/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractMappingsFromSnapshot } from './extract_mappings_from_snapshot';
import type { MigrationSnapshot } from '../types';

describe('extractMappingsFromSnapshot', () => {
  it('returns a type-name to mappings map from snapshot type definitions', () => {
    const snapshot: MigrationSnapshot = {
      meta: {
        date: '2026-01-01',
        kibanaCommitHash: 'abc123',
        buildUrl: null,
        pullRequestUrl: null,
        timestamp: 0,
      },
      typeDefinitions: {
        dashboard: {
          name: 'dashboard',
          hash: 'hash-dashboard',
          migrationVersions: [],
          schemaVersions: [],
          modelVersions: [],
          mappings: {
            dynamic: false,
            properties: {
              title: { type: 'text' },
            },
          },
        },
        lens: {
          name: 'lens',
          hash: 'hash-lens',
          migrationVersions: [],
          schemaVersions: [],
          modelVersions: [],
          mappings: {
            dynamic: false,
            properties: {
              description: { type: 'text' },
            },
          },
        },
      },
    };

    expect(extractMappingsFromSnapshot(snapshot)).toEqual({
      dashboard: snapshot.typeDefinitions.dashboard.mappings,
      lens: snapshot.typeDefinitions.lens.mappings,
    });
  });
});
