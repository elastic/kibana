/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

export interface PanelTypeMigrationContext {
  savedObjectsClient: SavedObjectsClientContract;
  /**
   * When true, allows keeping a migrated panel even if the target panel type has no registered
   * server schema.
   *
   * Intended for internal, Kibana-application-only responses. Public REST responses still require
   * a target schema to safely validate and document the returned config.
   */
  allowMissingTargetSchema?: boolean;
}

export interface PanelTypeMigrationPanel {
  id: string;
  config: Record<string, unknown>;
}

export interface PanelTypeMigrationSuccessResult {
  panelId: string;
  config: Record<string, unknown>;
}

export interface PanelTypeMigrationErrorResult {
  panelId: string;
  error: Error;
}

export type PanelTypeMigrationResult =
  | PanelTypeMigrationSuccessResult
  | PanelTypeMigrationErrorResult;

export interface PanelTypeMigration {
  from: string;
  to: string;
  migrateOut: (
    panels: readonly PanelTypeMigrationPanel[],
    context: PanelTypeMigrationContext
  ) => Promise<readonly PanelTypeMigrationResult[]>;
}
