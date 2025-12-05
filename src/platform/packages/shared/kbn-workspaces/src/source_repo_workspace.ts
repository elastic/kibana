/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { createHash } from 'crypto';
import execa from 'execa';
import { AbstractWorkspace } from './abstract_workspace';
import type { SourceRepoWorkspaceState, WorkspaceGlobalContext, WorkspaceState } from './types';
import { getRef } from './utils/get_ref';
import { getSha } from './utils/get_sha';
import type { WorkspaceController } from './workspace_controller';

export class SourceRepoWorkspace extends AbstractWorkspace {
  constructor(
    private readonly sourceRepoState: SourceRepoWorkspaceState,
    controller: WorkspaceController,
    context: WorkspaceGlobalContext
  ) {
    super(
      {
        dir: sourceRepoState.dir,
        tasks: sourceRepoState.tasks,
      },
      controller,
      context
    );
  }

  protected async getCacheKey(): Promise<string> {
    const directory = this.getDir();

    const ref = await getRef(directory);
    const baseCommitSha = await getSha(directory, ref);

    const { stdout: combinedDiff } = await execa('git', ['diff', 'HEAD'], { cwd: directory });
    const hash = createHash('sha256');
    hash.update(baseCommitSha, 'utf8');
    if (combinedDiff) {
      hash.update('\0', 'utf8');
      hash.update(combinedDiff, 'utf8');
    }

    return hash.digest('hex');
  }

  protected getState(): WorkspaceState {
    return this.sourceRepoState;
  }

  public getDisplayName(): string {
    return 'cwd';
  }
}
