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
  const migrations = new Map<string, PanelTypeMigration>();

  const registerPanelTypeMigration = (migration: PanelTypeMigration) => {
    if (migrations.has(migration.from)) {
      throw new Error(`Panel type migration from "${migration.from}" is already registered.`);
    }
    migrations.set(migration.from, migration);
  };

  const getPanelTypeMigration = (from: string): PanelTypeMigration | undefined =>
    migrations.get(from);

  return {
    registerPanelTypeMigration,
    getPanelTypeMigration,
  };
}
