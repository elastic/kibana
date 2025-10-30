/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertValidUpdates } from './compare';
import type { MigrationSnapshot } from '../types';
import path from 'path';
import fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';

// Mock ToolingLog
let log: jest.Mocked<ToolingLog>;

// Helper to load JSON mocks
function loadSnapshot(filename: string): MigrationSnapshot {
  const filePath = path.join(__dirname, 'mocks', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('assertValidUpdates', () => {
  beforeEach(() => {
    log = {
      info: jest.fn(),
      debug: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;
    jest.clearAllMocks();
  });

  it('should pass when there are no changes in the snapshots', () => {
    const from = loadSnapshot('baseline.json');
    expect(() => assertValidUpdates({ log, from, to: from })).not.toThrowError();
    expect(log.info).toHaveBeenCalledWith(
      '✅ Current SO type definitions are compatible with the baseline'
    );
  });

  it('should pass when snapshots are compatible', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('compatible_updates.json');

    expect(() => assertValidUpdates({ log, from, to })).not.toThrowError();
    expect(log.info).toHaveBeenCalledWith(
      '✅ Current SO type definitions are compatible with the baseline'
    );
  });

  it('should throw if migrations are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_deleted.json');

    expect(() => assertValidUpdates({ log, from, to })).toThrowError(
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if new migrations are added', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_added.json');

    expect(() => assertValidUpdates({ log, from, to })).toThrowError(
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if modelVersions are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('model_versions_deleted.json');

    expect(() => assertValidUpdates({ log, from, to })).toThrowError(
      `❌ Some model versions have been deleted for SO type 'task'.`
    );
  });

  it('should throw if more than one new model version is defined', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('two_new_model_versions.json');
    expect(() => assertValidUpdates({ log, from, to })).toThrowError(
      `❌ The SO type 'task' is defining two (or more) new model versions. Please refer to our troubleshooting guide: https://docs.elastic.dev/kibana-dev-docs/tutorials/saved-objects#troubleshooting`
    );
  });

  it('should throw if existing model versions are mutated', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mutated_model_versions.json');

    expect(() => assertValidUpdates({ log, from, to })).toThrowError(
      `❌ Some modelVersions have been updated for SO type 'task' after they were defined: 10.6.0.`
    );
  });

  it('should throw if model versions are not consecutive integers starting at 1', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('non_consecutive_model_versions.json');

    expect(() => assertValidUpdates({ log, from, to })).toThrowError(
      `❌ The 'task' SO type is missing model version '7'. Model versions defined: 1,2,3,4,5,6,8`
    );
  });

  it('should throw if mappings are updated without a modelVersion bump', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mappings_updated_no_bump.json');

    expect(() => assertValidUpdates({ log, from, to })).toThrowError(
      `❌ The 'task' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
    );
  });
});
