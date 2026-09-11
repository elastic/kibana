/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPanelTypeMigrationRegistry } from './registry';
import type { PanelTypeMigration } from './types';

describe('panel type migration registry', () => {
  test('returns all migrations for a source type', () => {
    const registry = getPanelTypeMigrationRegistry();

    const aToB: PanelTypeMigration = {
      from: 'a',
      to: 'b',
      migrateOut: () => [],
    };

    const aToC: PanelTypeMigration = {
      from: 'a',
      to: 'c',
      migrateOut: () => [],
    };

    registry.registerPanelTypeMigration(aToB);
    registry.registerPanelTypeMigration(aToC);

    const migrations = registry.getPanelTypeMigrations('a');
    expect(migrations.map(({ to }) => to)).toEqual(['b', 'c']);
    expect(registry.getPanelTypeMigrations('unknown')).toEqual([]);
  });

  test('rejects duplicate (from, to) registrations', () => {
    const registry = getPanelTypeMigrationRegistry();

    registry.registerPanelTypeMigration({
      from: 'a',
      to: 'b',
      migrateOut: () => [],
    });

    expect(() =>
      registry.registerPanelTypeMigration({
        from: 'a',
        to: 'b',
        migrateOut: () => [],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Panel type migration (\\"a\\" -> \\"b\\") is already registered."`
    );
  });
});
