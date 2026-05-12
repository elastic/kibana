/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationInfoRecord, MigrationSnapshot, ModelVersionSummary } from '../../types';
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

  it('throws when a type virtual version is downgraded', () => {
    const from = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')]),
    ]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);

    expect(() => validateNoVirtualVersionDowngrade({ from, to })).toThrow(
      /foo.*10\.2\.0.*=>.*10\.1\.0/s
    );
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

  it('aggregates multiple downgrades into a single error', () => {
    const from = buildSnapshot([
      buildRecord('foo', [buildModelVersion('2')]),
      buildRecord('bar', [buildModelVersion('3')]),
    ]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1')]),
      buildRecord('bar', [buildModelVersion('1')]),
    ]);

    let error: Error | undefined;
    try {
      validateNoVirtualVersionDowngrade({ from, to });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error!.message).toMatch(/'foo': 10\.2\.0 => 10\.1\.0/);
    expect(error!.message).toMatch(/'bar': 10\.3\.0 => 10\.1\.0/);
  });
});
