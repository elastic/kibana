/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PanelTypeMigration } from './types';

export function getPanelTypeMigrationRegistry() {
  const migrationsBySource = new Map<string, Map<string, PanelTypeMigration>>();

  const registerPanelTypeMigration = (migration: PanelTypeMigration) => {
    const { from, to } = migration;
    const byTarget = migrationsBySource.get(from) ?? new Map<string, PanelTypeMigration>();

    if (byTarget.has(to)) {
      throw new Error(`Panel type migration ("${from}" -> "${to}") is already registered.`);
    }

    byTarget.set(to, migration);
    migrationsBySource.set(from, byTarget);
  };

  const getPanelTypeMigrations = (from: string): readonly PanelTypeMigration[] => {
    const byTarget = migrationsBySource.get(from);
    return byTarget ? Array.from(byTarget.values()) : [];
  };

  return {
    registerPanelTypeMigration,
    getPanelTypeMigrations,
  };
}
