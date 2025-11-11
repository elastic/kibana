/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateChanges } from './validate_changes';
import type { MigrationSnapshot } from '../types';
import path from 'path';
import fs from 'fs';

// Helper to load JSON mocks
function loadSnapshot(filename: string): MigrationSnapshot {
  const filePath = path.join(__dirname, 'mocks', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('validateChanges', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should throw if migrations are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_deleted.json');

    expect(() => validateChanges({ from, to, name: 'config' })).toThrowError(
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if new migrations are added', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_added.json');

    expect(() => validateChanges({ from, to, name: 'config' })).toThrowError(
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if modelVersions are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('model_versions_deleted.json');

    expect(() => validateChanges({ from, to, name: 'task' })).toThrowError(
      `❌ Some model versions have been deleted for SO type 'task'.`
    );
  });

  it('should throw if more than one new model version is defined', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('two_new_model_versions.json');
    expect(() => validateChanges({ from, to, name: 'task' })).toThrowError(
      `❌ The SO type 'task' is defining two (or more) new model versions. Please refer to our troubleshooting guide: https://docs.elastic.dev/kibana-dev-docs/tutorials/saved-objects#troubleshooting`
    );
  });

  it('should throw if existing model versions are mutated', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mutated_model_versions.json');

    expect(() => validateChanges({ from, to, name: 'task' })).toThrowError(
      `❌ Some modelVersions have been updated for SO type 'task' after they were defined: 10.6.0.`
    );
  });

  it('should throw if model versions are not consecutive integers starting at 1', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('non_consecutive_model_versions.json');

    expect(() => validateChanges({ from, to, name: 'task' })).toThrowError(
      `❌ The 'task' SO type is missing model version '7'. Model versions defined: 1,2,3,4,5,6,8`
    );
  });

  it('should throw if mappings are updated without a modelVersion bump', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mappings_updated_no_bump.json');

    expect(() => validateChanges({ from, to, name: 'task' })).toThrowError(
      `❌ The 'task' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
    );
  });
});
