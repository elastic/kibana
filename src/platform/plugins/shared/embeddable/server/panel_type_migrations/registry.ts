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
  const migrationsBySource = new Map<string, PanelTypeMigration[]>();

  const registerPanelTypeMigration = (migration: PanelTypeMigration) => {
    const { from, to } = migration;
    const existing = migrationsBySource.get(from) ?? [];

    if (existing.some((registered) => registered.to === to)) {
      throw new Error(`Panel type migration ("${from}" -> "${to}") is already registered.`);
    }

    migrationsBySource.set(from, [...existing, migration]);
  };

  const getPanelTypeMigrations = (from: string): readonly PanelTypeMigration[] => {
    return migrationsBySource.get(from) ?? [];
  };

  return {
    registerPanelTypeMigration,
    getPanelTypeMigrations,
  };
}
