/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalWorkspaceSettings, WorkspaceSettings } from './types';

const DEFAULT_MAX_WORKSPACES = 10;

export function getInternalWorkspaceSettings(
  settings: Pick<WorkspaceSettings, 'maxWorkspaces'>
): InternalWorkspaceSettings {
  return {
    maxWorkspaces: settings.maxWorkspaces || DEFAULT_MAX_WORKSPACES,
  };
}
