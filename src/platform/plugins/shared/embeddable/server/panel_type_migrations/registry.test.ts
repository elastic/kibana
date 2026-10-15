/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPanelTypeMigrationRegistry } from './registry';

describe('panel type migration registry', () => {
  test('returns the migration registered for a source type', () => {
    const registry = getPanelTypeMigrationRegistry();
    const migration = { from: 'a', migrateOut: async () => [] };

    registry.registerPanelTypeMigration(migration);

    expect(registry.getPanelTypeMigration('a')).toBe(migration);
    expect(registry.getPanelTypeMigration('unknown')).toBeUndefined();
  });

  test('rejects a second migration for the same source type', () => {
    const registry = getPanelTypeMigrationRegistry();

    registry.registerPanelTypeMigration({ from: 'a', migrateOut: async () => [] });

    expect(() =>
      registry.registerPanelTypeMigration({ from: 'a', migrateOut: async () => [] })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Panel type migration from \\"a\\" is already registered."`
    );
  });
});
