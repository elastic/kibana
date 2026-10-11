/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord, ModelVersionSummary } from '../../types';
import { isSavedObjectsCheckError } from '../../findings';
import {
  getMappingFieldPaths,
  validateNoIndexOrEnabledFalse,
  validateNoIndexOrEnabledFalseInAllMappings,
  validateUpdateSchemaContinuity,
} from './common_utils';

describe('validateUpdateSchemaContinuity', () => {
  const attrs = schema.object({ title: schema.string() });
  const buildType = (modelVersions: SavedObjectsType['modelVersions']): SavedObjectsType => ({
    name: 'my-type',
    hidden: false,
    namespaceType: 'agnostic',
    mappings: { properties: {} },
    modelVersions,
  });

  it('does not throw when no model version defines an update schema', () => {
    const type = buildType({
      1: { changes: [], schemas: { create: attrs } },
      2: { changes: [], schemas: { create: attrs } },
    });
    expect(() => validateUpdateSchemaContinuity('my-type', type)).not.toThrow();
  });

  it('does not throw when update is introduced by a later model version', () => {
    const type = buildType({
      1: { changes: [], schemas: { create: attrs } },
      2: { changes: [], schemas: { create: attrs, update: attrs } },
      3: { changes: [], schemas: { create: attrs, update: attrs } },
    });
    expect(() => validateUpdateSchemaContinuity('my-type', type)).not.toThrow();
  });

  it('throws when a model version after the first update schema omits update', () => {
    const type = buildType({
      1: { changes: [], schemas: { create: attrs, update: attrs } },
      2: { changes: [], schemas: { create: attrs } },
    });
    expect(() => validateUpdateSchemaContinuity('my-type', type)).toThrow(
      "The SO type 'my-type' defines an 'update' schema in model version '1', but model version(s) '2' do not."
    );
  });
});

describe('validateNoIndexOrEnabledFalse', () => {
  const modelVersionWithFlattenedNewMappings: ModelVersionSummary = {
    version: '2',
    modelVersionHash: 'hash',
    changeTypes: ['mappings_addition'],
    hasTransformation: false,
    newMappings: ['category.type', 'category.index', 'category.doc_values'],
    schemas: { create: false, forwardCompatibility: false },
  };

  const toWithIndexFalse: MigrationInfoRecord = {
    name: 'my-type',
    hash: 'hash',
    migrationVersions: [],
    schemaVersions: [],
    modelVersions: [modelVersionWithFlattenedNewMappings],
    mappings: {
      'properties.category.type': 'keyword',
      'properties.category.index': false,
      'properties.category.doc_values': false,
    },
  };

  it('reports each violating field once when newMappings lists multiple flattened paths', () => {
    try {
      validateNoIndexOrEnabledFalse('my-type', toWithIndexFalse, [
        modelVersionWithFlattenedNewMappings,
      ]);
      fail('expected SavedObjectsCheckError');
    } catch (err) {
      expect(isSavedObjectsCheckError(err)).toBe(true);
      if (!isSavedObjectsCheckError(err)) {
        return;
      }
      expect(err.findings).toHaveLength(1);
      expect(err.findings[0].message).toBe(
        "The SO type 'my-type' has new mapping fields with 'index: false': category."
      );
    }
  });
});

describe('empty-object field handling (preserved `properties: {}` leaves)', () => {
  // Snapshots now preserve empty object fields as an explicit `properties.<field>.properties: {}`
  // flattened leaf. These tests lock in that the flattened-mapping consumers tolerate that key.
  const mappingsWithEmptyObjectField: Record<string, unknown> = {
    dynamic: false,
    'properties.title.type': 'text',
    'properties.pending_upgrade_review.dynamic': false,
    'properties.pending_upgrade_review.properties': {},
  };

  it('does not derive a spurious field path from an empty-object `properties` leaf', () => {
    // The empty-object leaf collapses to the same parent path as its sibling `dynamic` key,
    // so the field set is exactly { title, pending_upgrade_review } with no `…properties` entry.
    expect(getMappingFieldPaths(mappingsWithEmptyObjectField)).toEqual([
      'pending_upgrade_review',
      'title',
    ]);
  });

  it('does not flag an empty-object field as an index/enabled violation', () => {
    const to: MigrationInfoRecord = {
      name: 'my-type',
      hash: 'hash',
      migrationVersions: [],
      schemaVersions: [],
      modelVersions: [],
      mappings: mappingsWithEmptyObjectField,
    };

    expect(() => validateNoIndexOrEnabledFalseInAllMappings('my-type', to)).not.toThrow();
  });
});
