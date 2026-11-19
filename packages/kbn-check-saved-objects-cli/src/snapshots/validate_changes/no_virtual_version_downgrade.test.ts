/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationInfoRecord, MigrationSnapshot, ModelVersionSummary } from '../../types';
import { RULE_IDS, isSavedObjectsCheckError } from '../../findings';
import {
  getVirtualVersionFromRecord,
  validateNoVirtualVersionDowngrade,
} from './no_virtual_version_downgrade';

function buildModelVersion(version: string): ModelVersionSummary {
  return {
    version,
    modelVersionHash: 'hash',
    changeTypes: [],
    hasTransformation: false,
    newMappings: [],
    schemas: { create: 'hash', forwardCompatibility: 'hash' },
  };
}

function buildRecord(name: string, modelVersions: ModelVersionSummary[] = []): MigrationInfoRecord {
  return {
    name,
    hash: 'hash',
    migrationVersions: [],
    schemaVersions: [],
    modelVersions,
    mappings: {},
  };
}

function buildSnapshot(records: MigrationInfoRecord[]): MigrationSnapshot {
  return {
    meta: {
      date: 'now',
      kibanaCommitHash: 'sha',
      buildUrl: null,
      pullRequestUrl: null,
      timestamp: 0,
    },
    typeDefinitions: Object.fromEntries(records.map((r) => [r.name, r])),
  };
}

describe('getVirtualVersionFromRecord', () => {
  it('returns 10.0.0 when the record is missing', () => {
    expect(getVirtualVersionFromRecord(undefined)).toEqual('10.0.0');
  });

  it('returns 10.0.0 when no model versions are defined', () => {
    expect(getVirtualVersionFromRecord(buildRecord('foo'))).toEqual('10.0.0');
  });

  it('returns 10.N.0 based on the highest model version number', () => {
    expect(
      getVirtualVersionFromRecord(
        buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')])
      )
    ).toEqual('10.2.0');
  });

  it('handles unordered model version entries', () => {
    expect(
      getVirtualVersionFromRecord(
        buildRecord('foo', [buildModelVersion('3'), buildModelVersion('1'), buildModelVersion('2')])
      )
    ).toEqual('10.3.0');
  });
});

describe('validateNoVirtualVersionDowngrade', () => {
  it('passes when virtual versions are equal across all types', () => {
    const from = buildSnapshot([buildRecord('foo', [buildModelVersion('2')])]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('2')])]);
    expect(() => validateNoVirtualVersionDowngrade({ from, to })).not.toThrow();
  });

  it('passes when a type adds a new model version (upgrade)', () => {
    const from = buildSnapshot([buildRecord('foo')]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    expect(() => validateNoVirtualVersionDowngrade({ from, to })).not.toThrow();
  });

  it('throws a SavedObjectsCheckError with a finding when a type virtual version is downgraded', () => {
    const from = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')]),
    ]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);

    let error: unknown;
    try {
      validateNoVirtualVersionDowngrade({ from, to });
    } catch (e) {
      error = e;
    }

    expect(isSavedObjectsCheckError(error)).toBe(true);
    if (!isSavedObjectsCheckError(error)) throw new Error('unreachable');
    expect(error.findings).toHaveLength(1);
    expect(error.findings[0]).toEqual(
      expect.objectContaining({
        ruleId: RULE_IDS.EXISTING_TYPE_VIRTUAL_VERSION_DOWNGRADE,
        severity: 'error',
        typeName: 'foo',
      })
    );
    expect(error.findings[0].message).toMatch(/'foo'.*'10\.2\.0'.*'10\.1\.0'/);
  });

  it('passes for a brand-new type with no model versions (10.0.0 == 10.0.0)', () => {
    const from = buildSnapshot([]);
    const to = buildSnapshot([buildRecord('foo')]);
    expect(() => validateNoVirtualVersionDowngrade({ from, to })).not.toThrow();
  });

  it('passes for a brand-new type with model versions (10.0.0 < 10.N.0)', () => {
    const from = buildSnapshot([]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    expect(() => validateNoVirtualVersionDowngrade({ from, to })).not.toThrow();
  });

  it('ignores types that exist in baseline but were removed', () => {
    const from = buildSnapshot([buildRecord('foo', [buildModelVersion('5')])]);
    const to = buildSnapshot([]);
    expect(() => validateNoVirtualVersionDowngrade({ from, to })).not.toThrow();
  });

  it('aggregates multiple downgrades into a single error with one finding per type', () => {
    const from = buildSnapshot([
      buildRecord('foo', [buildModelVersion('2')]),
      buildRecord('bar', [buildModelVersion('3')]),
    ]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1')]),
      buildRecord('bar', [buildModelVersion('1')]),
    ]);

    let error: unknown;
    try {
      validateNoVirtualVersionDowngrade({ from, to });
    } catch (e) {
      error = e;
    }

    expect(isSavedObjectsCheckError(error)).toBe(true);
    if (!isSavedObjectsCheckError(error)) throw new Error('unreachable');
    expect(error.findings).toHaveLength(2);
    expect(error.findings.map((f) => f.typeName)).toEqual(['foo', 'bar']);
    expect(
      error.findings.every((f) => f.ruleId === RULE_IDS.EXISTING_TYPE_VIRTUAL_VERSION_DOWNGRADE)
    ).toBe(true);
  });
});
