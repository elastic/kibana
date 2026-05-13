/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ToolingLog } from '@kbn/tooling-log';
import { createWorkspaceGlobalContext } from './create_workspace_global_context';
import { ensureClonedRepo } from './ensure_cloned_repo';
import { WorkspaceController } from './workspace_controller';
import type { WorktreeWorkspace } from './worktree_workspace';
import type { WorkspaceSettings } from './types';
import { getSha } from './utils/get_sha';

export async function activateWorktree({
  log,
  ref,
  settings,
}: {
  log: ToolingLog;
  ref: string;
  settings?: WorkspaceSettings;
}): Promise<WorktreeWorkspace> {
  const context = createWorkspaceGlobalContext({
    log,
    settings,
  });

  await ensureClonedRepo(context);

  const workspaceController = new WorkspaceController(context);

  const workspace = await workspaceController.activateWorktree(await getSha(context.repoRoot, ref));

  return workspace;
}
