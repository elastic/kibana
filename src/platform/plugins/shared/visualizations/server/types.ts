/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegacyPanelMigration } from './legacy_panel_migrations/types';

export interface VisualizationsServerSetup {
  registerReadOnlyVisType: (visType: string) => void;
  /**
   * Registers a read-time migration of by-value legacy visualization panels of `visType` to
   * another panel type. Only one migration may be registered per vis type.
   */
  registerLegacyPanelMigration: (visType: string, migration: LegacyPanelMigration) => void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizationsServerStart {}
