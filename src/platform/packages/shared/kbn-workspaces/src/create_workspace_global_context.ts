/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import type { WorkspaceGlobalContext, WorkspaceSettings } from './types';
import { getInternalWorkspaceSettings } from './get_internal_workspaces_settings';

export function createWorkspaceGlobalContext({
  log: parentLog,
  settings,
}: {
  log: ToolingLog;
  settings?: WorkspaceSettings;
}): WorkspaceGlobalContext {
  const log = parentLog.withContext('@kbn/workspaces');

  const repoRoot = settings?.repoRoot ?? REPO_ROOT;
  const workspacesRoot = settings?.workspacesRoot ?? Path.join(repoRoot, 'data', 'kbn-workspaces');

  const context: WorkspaceGlobalContext = {
    log,
    baseCloneDir: Path.join(workspacesRoot, 'base'),
    stateFilepath: Path.join(workspacesRoot, 'state.json'),
    repoRoot,
    workspacesRoot,
    settings: getInternalWorkspaceSettings({
      maxWorkspaces: settings?.maxWorkspaces,
    }),
  };

  return context;
}
