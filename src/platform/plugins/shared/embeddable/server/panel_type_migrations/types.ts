/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PanelTypeMigration {
  from: string;
  /**
   * Returns the target panel type and config for a panel of the `from` type, or `undefined` to leave
   * the panel unchanged. Throwing drops the panel with a warning.
   */
  migrateOut: (config: object) => { type: string; config: object } | undefined;
}
