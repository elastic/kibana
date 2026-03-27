/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Migration, MigrationMatchContext } from './migrations';
import { migrations } from './migrations';

export type { MigrationMatchContext };

export interface MigrationHint extends Migration {
  glyphClassName: string;
  hoverMessage: string;
}

export const migrationHints: Record<string, MigrationHint> = Object.fromEntries(
  Object.entries(migrations).map(([key, migration]) => [
    key,
    {
      ...migration,
      glyphClassName: 'migration-hint-glyph',
      hoverMessage: migration.description,
    },
  ])
);
