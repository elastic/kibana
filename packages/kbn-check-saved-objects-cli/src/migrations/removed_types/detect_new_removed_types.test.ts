/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationSnapshot } from '../../types';
import { detectNewRemovedTypes } from './detect_new_removed_types';

const snapshotWithTypes = (...typeNames: string[]): MigrationSnapshot => ({
  meta: {
    date: '2026-01-01',
    kibanaCommitHash: 'abc',
    buildUrl: null,
    pullRequestUrl: null,
    timestamp: 0,
  },
  typeDefinitions: Object.fromEntries(
    typeNames.map((name) => [
      name,
      {
        name,
        migrationVersions: [],
        schemaVersions: [],
        modelVersions: [],
        mappings: {},
        hash: '',
      },
    ])
  ),
});

describe('detectNewRemovedTypes', () => {
  it('flags a type that exists in the baseline but is no longer registered', () => {
    const from = snapshotWithTypes('dashboard', 'legacy_type');
    const to = snapshotWithTypes('dashboard');

    expect(detectNewRemovedTypes(from, to, [])).toEqual(['legacy_type']);
  });

  it('does not flag a type that is already tracked in removed_types.json', () => {
    const from = snapshotWithTypes('dashboard', 'legacy_type');
    const to = snapshotWithTypes('dashboard');

    expect(detectNewRemovedTypes(from, to, ['legacy_type'])).toEqual([]);
  });

  it('does not flag an existing type that was converted into a WIP type', () => {
    const from = snapshotWithTypes('dashboard', 'alerting_rule');
    const to = snapshotWithTypes('dashboard');

    expect(detectNewRemovedTypes(from, to, [], ['alerting_rule'])).toEqual([]);
  });

  it('still flags genuinely removed types alongside WIP types', () => {
    const from = snapshotWithTypes('dashboard', 'alerting_rule', 'legacy_type');
    const to = snapshotWithTypes('dashboard');

    expect(detectNewRemovedTypes(from, to, [], ['alerting_rule'])).toEqual(['legacy_type']);
  });

  it('returns the removed types sorted alphabetically', () => {
    const from = snapshotWithTypes('zeta', 'alpha', 'kept');
    const to = snapshotWithTypes('kept');

    expect(detectNewRemovedTypes(from, to, [])).toEqual(['alpha', 'zeta']);
  });

  it('returns an empty array when nothing was removed', () => {
    const from = snapshotWithTypes('dashboard');
    const to = snapshotWithTypes('dashboard', 'new_type');

    expect(detectNewRemovedTypes(from, to, [])).toEqual([]);
  });
});
