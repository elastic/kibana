/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationInfoRecord, MigrationSnapshot, ModelVersionSummary } from '../types';
import { classifyUpdatedTypes } from './classify_updated_types';

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

describe('classifyUpdatedTypes', () => {
  it('returns empty lists when both snapshots are identical', () => {
    const snapshot = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    const result = classifyUpdatedTypes({ from: snapshot, to: snapshot });
    expect(result.updatedTypes).toEqual([]);
    expect(result.typesWithNewModelVersions).toEqual([]);
  });

  it('includes a type in updatedTypes when a new model version is added', () => {
    const from = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')]),
    ]);
    const { updatedTypes, typesWithNewModelVersions } = classifyUpdatedTypes({ from, to });
    expect(updatedTypes).toEqual(['foo']);
    expect(typesWithNewModelVersions).toEqual(['foo']);
  });

  it('includes a type in updatedTypes when the first model version is introduced', () => {
    const from = buildSnapshot([buildRecord('foo')]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    const { updatedTypes, typesWithNewModelVersions } = classifyUpdatedTypes({ from, to });
    expect(updatedTypes).toEqual(['foo']);
    expect(typesWithNewModelVersions).toEqual(['foo']);
  });

  it('includes a type in updatedTypes when a schema changes within an existing model version', () => {
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
    const { updatedTypes, typesWithNewModelVersions } = classifyUpdatedTypes({ from, to });
    expect(updatedTypes).toEqual(['foo']);
    expect(typesWithNewModelVersions).toEqual([]);
  });

  it('includes a type in updatedTypes when top-level mappings change', () => {
    const from = buildSnapshot([buildRecord('foo', [], { mappings: {} })]);
    const to = buildSnapshot([
      buildRecord('foo', [], { mappings: { 'properties.title': { type: 'text' } } }),
    ]);
    const { updatedTypes, typesWithNewModelVersions } = classifyUpdatedTypes({ from, to });
    expect(updatedTypes).toEqual(['foo']);
    expect(typesWithNewModelVersions).toEqual([]);
  });

  it('does not include a brand-new type (absent from the baseline) in either list', () => {
    const from = buildSnapshot([]);
    const to = buildSnapshot([buildRecord('foo', [buildModelVersion('1')])]);
    const result = classifyUpdatedTypes({ from, to });
    expect(result.updatedTypes).toEqual([]);
    expect(result.typesWithNewModelVersions).toEqual([]);
  });

  it('does not include an unchanged type in either list', () => {
    const record = buildRecord('foo', [buildModelVersion('1')]);
    const unchanged = buildRecord('bar', [buildModelVersion('2')]);
    const from = buildSnapshot([record, unchanged]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1'), buildModelVersion('2')]),
      unchanged,
    ]);
    const result = classifyUpdatedTypes({ from, to });
    expect(result.updatedTypes).toEqual(['foo']);
    expect(result.typesWithNewModelVersions).toEqual(['foo']);
  });

  it('does not include a type in typesWithNewModelVersions when only mappings change without a new model version', () => {
    const from = buildSnapshot([buildRecord('foo', [buildModelVersion('1')], { mappings: {} })]);
    const to = buildSnapshot([
      buildRecord('foo', [buildModelVersion('1')], {
        mappings: { 'properties.title': { type: 'text' } },
      }),
    ]);
    const { updatedTypes, typesWithNewModelVersions } = classifyUpdatedTypes({ from, to });
    expect(updatedTypes).toEqual(['foo']);
    expect(typesWithNewModelVersions).toEqual([]);
  });

  it('includes a type in both lists when it has a new model version AND schema changes in existing versions', () => {
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
    const { updatedTypes, typesWithNewModelVersions } = classifyUpdatedTypes({ from, to });
    expect(updatedTypes).toEqual(['foo']);
    expect(typesWithNewModelVersions).toEqual(['foo']);
  });

  it('classifies a mixed snapshot: schema-only change, new model version, and unchanged type', () => {
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
});
