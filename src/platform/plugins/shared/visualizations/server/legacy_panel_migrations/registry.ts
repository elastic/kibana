/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegacyPanelMigration } from './types';

export const getLegacyPanelMigrationRegistry = () => {
  const migrations = new Map<string, LegacyPanelMigration>();

  return {
    registerLegacyPanelMigration: (visType: string, migration: LegacyPanelMigration) => {
      if (migrations.has(visType)) {
        throw new Error(`Legacy panel migration for vis type "${visType}" is already registered.`);
      }
      migrations.set(visType, migration);
    },
    getLegacyPanelMigration: (visType: string) => migrations.get(visType),
  };
};
