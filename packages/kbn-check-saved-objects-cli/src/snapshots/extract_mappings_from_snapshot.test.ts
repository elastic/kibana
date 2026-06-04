/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import { extractMigrationInfo } from '@kbn/core-test-helpers-so-type-serializer';
import { getFlattenedObject } from '@kbn/std';
import {
  extractMappingsFromSnapshot,
  unflattenSnapshotMappings,
} from './extract_mappings_from_snapshot';
import type { MigrationSnapshot } from '../types';

const roundTripMappingFixtures: Array<{
  name: string;
  mappings: SavedObjectsTypeMappingDefinition;
}> = [
  {
    name: 'simple text fields',
    mappings: {
      dynamic: false,
      properties: {
        title: { type: 'text' },
        content: { type: 'text', index: false },
      },
    },
  },
  {
    name: 'multi-field',
    mappings: {
      dynamic: false,
      properties: {
        slug: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
            },
          },
        },
      },
    },
  },
  {
    name: 'deeply nested object fields',
    mappings: {
      dynamic: false,
      properties: {
        kibanaSavedObjectMeta: {
          properties: { searchSourceJSON: { type: 'text', index: false } },
        },
        refreshInterval: {
          properties: {
            display: { type: 'keyword', index: false, doc_values: false },
            pause: { type: 'boolean', index: false, doc_values: false },
          },
        },
      },
    },
  },
  {
    name: 'empty root properties',
    mappings: {
      dynamic: false,
      properties: {},
    },
  },
  {
    name: 'nested field type',
    mappings: {
      dynamic: false,
      properties: {
        schemaVersion: { type: 'keyword' },
        artifacts: { type: 'nested' },
      },
    },
  },
];

const flattenSnapshotMappings = (
  mappings: SavedObjectsTypeMappingDefinition
): Record<string, unknown> =>
  extractMigrationInfo({
    name: 'test-type',
    hidden: false,
    namespaceType: 'single',
    mappings,
  }).mappings;

describe('unflattenSnapshotMappings', () => {
  it('converts flattened snapshot mappings into nested mapping definitions', () => {
    expect(
      unflattenSnapshotMappings({
        dynamic: false,
        'properties.title.type': 'text',
        'properties.content.type': 'text',
        'properties.content.index': false,
      })
    ).toEqual({
      dynamic: false,
      properties: {
        title: { type: 'text' },
        content: { type: 'text', index: false },
      },
    });
  });

  it('returns nested mappings unchanged', () => {
    const nested = {
      dynamic: false,
      properties: {
        title: { type: 'text' },
      },
    };

    expect(unflattenSnapshotMappings(nested)).toEqual(nested);
  });

  it('restores empty root properties omitted by flattening', () => {
    const flattened = getFlattenedObject({ dynamic: false, properties: {} });

    expect(flattened).toEqual({ dynamic: false });
    expect(unflattenSnapshotMappings(flattened)).toEqual({
      dynamic: false,
      properties: {},
    });
  });

  it.each(roundTripMappingFixtures)(
    'round-trips snapshot flatten/unflatten for $name',
    ({ mappings }) => {
      const flattened = flattenSnapshotMappings(mappings);

      expect(unflattenSnapshotMappings(flattened)).toEqual(mappings);
    }
  );

  it.each(roundTripMappingFixtures)(
    'produces mappings that migrator validation can flatten for $name',
    ({ mappings }) => {
      const roundTripped = unflattenSnapshotMappings(flattenSnapshotMappings(mappings));

      expect(getFlattenedObject(roundTripped.properties)).toEqual(
        getFlattenedObject(mappings.properties)
      );
    }
  );
});

describe('extractMappingsFromSnapshot', () => {
  it('returns nested type-name to mappings map from flattened snapshot type definitions', () => {
    const snapshot: MigrationSnapshot = {
      meta: {
        date: '2026-01-01',
        kibanaCommitHash: 'abc123',
        buildUrl: null,
        pullRequestUrl: null,
        timestamp: 0,
      },
      typeDefinitions: {
        markdown: {
          name: 'markdown',
          hash: 'hash-markdown',
          migrationVersions: [],
          schemaVersions: [],
          modelVersions: [],
          mappings: {
            dynamic: false,
            'properties.title.type': 'text',
            'properties.content.type': 'text',
            'properties.content.index': false,
          },
        },
      },
    };

    expect(extractMappingsFromSnapshot(snapshot)).toEqual({
      markdown: {
        dynamic: false,
        properties: {
          title: { type: 'text' },
          content: { type: 'text', index: false },
        },
      },
    });
  });

  it('restores empty root properties for types with no mapped fields', () => {
    const snapshot: MigrationSnapshot = {
      meta: {
        date: '2026-01-01',
        kibanaCommitHash: 'abc123',
        buildUrl: null,
        pullRequestUrl: null,
        timestamp: 0,
      },
      typeDefinitions: {
        anonymizationSalt: {
          name: 'anonymizationSalt',
          hash: 'hash-anonymization-salt',
          migrationVersions: [],
          schemaVersions: [],
          modelVersions: [],
          mappings: {
            dynamic: false,
          },
        },
      },
    };

    expect(extractMappingsFromSnapshot(snapshot)).toEqual({
      anonymizationSalt: {
        dynamic: false,
        properties: {},
      },
    });
  });
});
