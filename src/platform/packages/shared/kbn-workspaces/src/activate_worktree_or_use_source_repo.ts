/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { activateWorktree } from './activate_worktree';
import { getWorkspaceFromSourceRepo } from './get_workspace_from_source_repo';
import { createWorkspaceGlobalContext } from './create_workspace_global_context';
import { getSha } from './utils/get_sha';
import type { WorktreeWorkspace } from './worktree_workspace';
import type { SourceRepoWorkspace } from './source_repo_workspace';

export async function activateWorktreeOrUseSourceRepo({
  log,
  ref,
}: {
  log: ToolingLog;
  ref?: string;
}): Promise<WorktreeWorkspace | SourceRepoWorkspace> {
  const context = createWorkspaceGlobalContext({
    log,
  });

  const sourceRepoHeadSha = await getSha(context.repoRoot, 'HEAD');

  if (!ref || ref === sourceRepoHeadSha) {
    return await getWorkspaceFromSourceRepo({ log });
  }

  return await activateWorktree({ log, ref });
}
