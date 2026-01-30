/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import { AbstractWorkspace } from './abstract_workspace';
import type { WorkspaceGlobalContext, WorkspaceState, WorktreeWorkspaceState } from './types';
import type { WorkspaceController } from './workspace_controller';
import { getSha } from './utils/get_sha';
import { checkout } from './checkout';

export class WorktreeWorkspace extends AbstractWorkspace {
  constructor(
    private readonly worktreeState: WorktreeWorkspaceState,
    controller: WorkspaceController,
    context: WorkspaceGlobalContext
  ) {
    super(
      {
        dir: Path.join(context.workspacesRoot, worktreeState.worktree.path),
        tasks: worktreeState.tasks,
      },
      controller,
      context
    );
  }

  protected async getSha(): Promise<string> {
    // Resolve the ref's SHA against the base clone so that new commits to the ref
    // are detected even if the worktree is currently detached at an older commit.
    return await getSha(this.context.baseCloneDir, this.worktreeState.ref);
  }

  protected async getCacheKey(): Promise<string> {
    return this.getSha();
  }

  protected getState(): WorkspaceState {
    return this.worktreeState;
  }

  async ensureCheckout(): Promise<void> {
    const cacheKey = await this.getCacheKey();

    if (this.state.tasks.checkout?.cacheKey !== cacheKey) {
      const sha = await this.getSha();
      await checkout({
        log: this.context.log,
        dir: this.getDir(),
        sha,
      });

      await this.controller.updateEntry(this.getState(), (e) => {
        e.tasks.checkout = { cacheKey };
        e.tasks.bootstrap = null;
        e.tasks.build = null;
      });
    }
  }

  public getDisplayName(): string {
    return this.worktreeState.ref.substring(0, 6);
  }
}
