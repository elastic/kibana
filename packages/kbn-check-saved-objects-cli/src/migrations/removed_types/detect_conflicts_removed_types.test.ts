/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationSnapshot } from '../../types';
import { isSavedObjectsCheckError, RULE_IDS } from '../../findings';
import { detectConflictsWithRemovedTypes } from './detect_conflicts_removed_types';

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

describe('detectConflictsWithRemovedTypes', () => {
  it('does not throw when no registered type reuses a removed name', async () => {
    const to = snapshotWithTypes('dashboard', 'visualization');

    await expect(detectConflictsWithRemovedTypes(to, ['legacy_type'])).resolves.toBeUndefined();
  });

  it('throws when a registered type reuses a previously removed name', async () => {
    const to = snapshotWithTypes('dashboard', 'legacy_type');

    await expect(detectConflictsWithRemovedTypes(to, ['legacy_type'])).rejects.toThrow(
      /Cannot re-register previously removed type 'legacy_type'/
    );
  });

  it('surfaces the conflict as a REMOVED_TYPE_NAME_REUSED finding', async () => {
    const to = snapshotWithTypes('legacy_type');

    expect.assertions(3);
    try {
      await detectConflictsWithRemovedTypes(to, ['legacy_type']);
    } catch (err) {
      expect(isSavedObjectsCheckError(err)).toBe(true);
      if (isSavedObjectsCheckError(err)) {
        expect(err.findings).toHaveLength(1);
        expect(err.findings[0].ruleId).toBe(RULE_IDS.REMOVED_TYPE_NAME_REUSED);
      }
    }
  });

  it('does not throw when the reused name belongs to a WIP type', async () => {
    const to = snapshotWithTypes('dashboard', 'alerting_rule');

    await expect(
      detectConflictsWithRemovedTypes(to, ['alerting_rule'], ['alerting_rule'])
    ).resolves.toBeUndefined();
  });

  it('still throws for non-WIP conflicts when WIP types are present', async () => {
    const to = snapshotWithTypes('alerting_rule', 'legacy_type');

    await expect(
      detectConflictsWithRemovedTypes(to, ['alerting_rule', 'legacy_type'], ['alerting_rule'])
    ).rejects.toThrow(/'legacy_type'/);
  });
});
