/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationInfoRecord, ModelVersionSummary } from '../../types';
import { isSavedObjectsCheckError } from '../../findings';
import { validateNoIndexOrEnabledFalse } from './common_utils';

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
