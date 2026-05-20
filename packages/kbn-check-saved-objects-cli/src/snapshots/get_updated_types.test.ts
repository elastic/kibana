/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationInfoRecord, MigrationSnapshot, ModelVersionSummary } from '../types';
import {
  classifyUpdatedTypes,
  getUpdatedTypes,
  getTypesWithNewModelVersions,
} from './get_updated_types';

function buildModelVersion(
  version: string,
  overrides: Partial<ModelVersionSummary> = {}
): ModelVersionSummary {
  return {
    version,
    modelVersionHash: `hash-${version}`,
    changeTypes: [],
    hasTransformation: false,
    newMappings: [],
    schemas: { create: false, forwardCompatibility: false },
    ...overrides,
  };
}

function buildRecord(
  name: string,
  modelVersions: ModelVersionSummary[] = [],
  overrides: Partial<MigrationInfoRecord> = {}
): MigrationInfoRecord {
  return {
    name,
    hash: 'hash',
    migrationVersions: [],
    schemaVersions: [],
    modelVersions,
    mappings: {},
    ...overrides,
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

describe('getUpdatedTypes', () => {
  it('returns no types when both snapshots are identical', () => {
    const record = buildRecord('foo', [buildModelVersion('1')]);
    const snapshot = buildSnapshot([record]);
    expect(getUpdatedTypes({ from: snapshot, to: snapshot })).toEqual([]);
  });

  it('returns a type when a new model version is added', () => {
    const from = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')]),
    ]);
    expect(getUpdatedTypes({ from, to })).toEqual(['foo']);
  });

  it('returns a type when a schema changes within an existing model version', () => {
    const from = buildSnapshot([
      buildRecord('foo', [
        buildModelVersion('1', { schemas: { create: false, forwardCompatibility: false } }),
      ]),
    ]);
    const to = buildSnapshot([
      buildRecord('foo', [
        buildModelVersion('1', {
          schemas: { create: { type: 'object', keys: {} }, forwardCompatibility: false },
        }),
      ]),
    ]);
    expect(getUpdatedTypes({ from, to })).toEqual(['foo']);
  });

  it('returns a type when top-level mappings change', () => {
    const from = buildSnapshot([buildRecord('foo', [], { mappings: {} })]);
    const to = buildSnapshot([
      buildRecord('foo', [], { mappings: { 'properties.title': { type: 'text' } } }),
    ]);
    expect(getUpdatedTypes({ from, to })).toEqual(['foo']);
  });

  it('does not return a brand-new type (absent from the baseline)', () => {
    const from = buildSnapshot([]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    expect(getUpdatedTypes({ from, to })).toEqual([]);
  });

  it('does not return a type that is unchanged', () => {
    const record = buildRecord('foo', [buildModelVersion('1')]);
    const unchanged = buildRecord('bar', [buildModelVersion('2')]);
    const from = buildSnapshot([record, unchanged]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')]),
      unchanged,
    ]);
    expect(getUpdatedTypes({ from, to })).toEqual(['foo']);
  });
});

describe('getTypesWithNewModelVersions', () => {
  it('returns no types when both snapshots are identical', () => {
    const record = buildRecord('foo', [buildModelVersion('1')]);
    const snapshot = buildSnapshot([record]);
    expect(getTypesWithNewModelVersions({ from: snapshot, to: snapshot })).toEqual([]);
  });

  it('returns a type when the first model version is introduced', () => {
    const from = buildSnapshot([buildRecord('foo')]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    expect(getTypesWithNewModelVersions({ from, to })).toEqual(['foo']);
  });

  it('returns a type when an additional model version is added', () => {
    const from = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')]),
    ]);
    expect(getTypesWithNewModelVersions({ from, to })).toEqual(['foo']);
  });

  it('does NOT return a type that only has schema changes in existing model versions', () => {
    const from = buildSnapshot([
      buildRecord('foo', [
        buildModelVersion('1', { schemas: { create: false, forwardCompatibility: false } }),
      ]),
    ]);
    const to = buildSnapshot([
      buildRecord('foo', [
        buildModelVersion('1', {
          schemas: {
            create: { type: 'object', keys: { title: { type: 'string' } } },
            forwardCompatibility: false,
          },
        }),
      ]),
    ]);
    // schema changed but no new model version → should NOT be returned
    expect(getTypesWithNewModelVersions({ from, to })).toEqual([]);
  });

  it('does NOT return a type that only has mapping changes without a new model version', () => {
    const from = buildSnapshot([buildRecord('foo', [buildModelVersion('1')], { mappings: {} })]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1')], {
        mappings: { 'properties.title': { type: 'text' } },
      }),
    ]);
    expect(getTypesWithNewModelVersions({ from, to })).toEqual([]);
  });

  it('does not return brand-new types (absent from the baseline)', () => {
    const from = buildSnapshot([]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    expect(getTypesWithNewModelVersions({ from, to })).toEqual([]);
  });

  it('returns only the subset of updated types that introduced new model versions', () => {
    const v1 = buildModelVersion('1');
    const v2 = buildModelVersion('2');
    // 'schema-only' had a schema change but same model version count
    // 'new-mv' added a model version
    // 'unchanged' is identical
    const from = buildSnapshot([
      buildRecord('schema-only', [
        buildModelVersion('1', { schemas: { create: false, forwardCompatibility: false } }),
      ]),
      buildRecord('new-mv', [v1]),
      buildRecord('unchanged', [v1]),
    ]);
    const to = buildSnapshot([
      buildRecord('schema-only', [
        buildModelVersion('1', {
          schemas: { create: { type: 'object', keys: {} }, forwardCompatibility: false },
        }),
      ]),
      buildRecord('new-mv', [v1, v2]),
      buildRecord('unchanged', [v1]),
    ]);

    expect(getTypesWithNewModelVersions({ from, to })).toEqual(['new-mv']);
  });

  it('returns a type that has both a new model version AND schema changes in existing versions', () => {
    const from = buildSnapshot([
      buildRecord('foo', [
        buildModelVersion('1', { schemas: { create: false, forwardCompatibility: false } }),
      ]),
    ]);
    const to = buildSnapshot([
      buildRecord('foo', [
        buildModelVersion('1', {
          schemas: { create: { type: 'object', keys: {} }, forwardCompatibility: false },
        }),
        buildModelVersion('2'),
      ]),
    ]);
    expect(getTypesWithNewModelVersions({ from, to })).toEqual(['foo']);
  });
});

describe('classifyUpdatedTypes', () => {
  it('returns both lists in a single pass', () => {
    const v1 = buildModelVersion('1');
    const v2 = buildModelVersion('2');
    const from = buildSnapshot([
      buildRecord('schema-only', [
        buildModelVersion('1', { schemas: { create: false, forwardCompatibility: false } }),
      ]),
      buildRecord('new-mv', [v1]),
      buildRecord('unchanged', [v1]),
    ]);
    const to = buildSnapshot([
      buildRecord('schema-only', [
        buildModelVersion('1', {
          schemas: { create: { type: 'object', keys: {} }, forwardCompatibility: false },
        }),
      ]),
      buildRecord('new-mv', [v1, v2]),
      buildRecord('unchanged', [v1]),
    ]);

    const result = classifyUpdatedTypes({ from, to });
    expect(result.updatedTypes).toEqual(['schema-only', 'new-mv']);
    expect(result.typesWithNewModelVersions).toEqual(['new-mv']);
  });

  it('guarantees that typesWithNewModelVersions is always a subset of updatedTypes', () => {
    const v1 = buildModelVersion('1');
    const v2 = buildModelVersion('2');
    const from = buildSnapshot([buildRecord('foo', [v1]), buildRecord('bar', [v1])]);
    const to = buildSnapshot([buildRecord('foo', [v1, v2]), buildRecord('bar', [v1, v2])]);

    const { updatedTypes, typesWithNewModelVersions } = classifyUpdatedTypes({ from, to });
    expect(typesWithNewModelVersions.every((t) => updatedTypes.includes(t))).toBe(true);
  });

  it('returns empty lists when both snapshots are identical', () => {
    const snapshot = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    const result = classifyUpdatedTypes({ from: snapshot, to: snapshot });
    expect(result.updatedTypes).toEqual([]);
    expect(result.typesWithNewModelVersions).toEqual([]);
  });
});
