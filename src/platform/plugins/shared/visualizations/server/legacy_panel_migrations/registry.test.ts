/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLegacyPanelMigrationRegistry } from './registry';

describe('legacy panel migration registry', () => {
  test('returns the migration registered for a vis type', () => {
    const registry = getLegacyPanelMigrationRegistry();
    const migration = { to: 'vega', migrate: () => undefined };

    registry.registerLegacyPanelMigration('vega', migration);

    expect(registry.getLegacyPanelMigration('vega')).toBe(migration);
    expect(registry.getLegacyPanelMigration('markdown')).toBeUndefined();
  });

  test('rejects a second migration for the same vis type', () => {
    const registry = getLegacyPanelMigrationRegistry();

    registry.registerLegacyPanelMigration('vega', { to: 'vega', migrate: () => undefined });

    expect(() =>
      registry.registerLegacyPanelMigration('vega', { to: 'other', migrate: () => undefined })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Legacy panel migration for vis type \\"vega\\" is already registered."`
    );
  });
});
