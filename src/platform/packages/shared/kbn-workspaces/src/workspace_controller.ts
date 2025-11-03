/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import Fs from 'fs/promises';
import { ensureWorktree } from './ensure_worktree';
import type {
  SourceRepoWorkspaceState,
  WorkspaceGlobalContext,
  WorkspaceGlobalState,
  WorkspaceState,
  WorktreeWorkspaceState,
} from './types';
import { WorktreeWorkspace } from './worktree_workspace';
import { SourceRepoWorkspace } from './source_repo_workspace';

const SOURCE_REPO_ID = '_source';

async function readOrCreateStateFile(file: string): Promise<WorkspaceGlobalState> {
  return await Fs.readFile(file, 'utf8')
    .catch(async () => {
      const defaults = { workspaces: {} } satisfies WorkspaceGlobalState;
      await writeGlobalState(file, defaults);
      return JSON.stringify(defaults);
    })
    .then((contents) => {
      try {
        return JSON.parse(contents) as WorkspaceGlobalState;
      } catch (error) {
        throw new Error(`Workspace state file is corrupted, fix errors or delete file to resolve`, {
          cause: error,
        });
      }
    });
}

async function writeGlobalState(file: string, state: WorkspaceGlobalState) {
  const tmp = `${file}.tmp`;
  await Fs.writeFile(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8');
  await Fs.rename(tmp, file);
}

export class WorkspaceController {
  private state: WorkspaceGlobalState | undefined;

  constructor(private readonly context: WorkspaceGlobalContext) {}

  private async loadState(): Promise<WorkspaceGlobalState> {
    this.state = await readOrCreateStateFile(this.context.stateFilepath);
    return this.state;
  }

  private async saveState(updated: WorkspaceGlobalState) {
    this.state = updated;
    await writeGlobalState(this.context.stateFilepath, updated);
  }

  private pruneIfNeeded(state: WorkspaceGlobalState) {
    const entries = Object.values(state.workspaces).sort((a, b) => a.lastUsed - b.lastUsed);
    while (entries.length > this.context.settings.maxWorkspaces) {
      const oldest = entries.shift();
      if (!oldest) break;
      delete state.workspaces[oldest.id];
      try {
        Fs.rm(oldest.id, { recursive: true, force: true }).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  private generateWorktreePath(): string {
    return randomUUID();
  }

  async fromSourceRepo(): Promise<SourceRepoWorkspace> {
    const state = await this.loadState();

    let sourceRepoState = state.workspaces[SOURCE_REPO_ID] as SourceRepoWorkspaceState | undefined;

    if (!sourceRepoState) {
      sourceRepoState = {
        type: 'source_repo',
        dir: this.context.repoRoot,
        id: SOURCE_REPO_ID,
        lastUsed: Date.now(),
        tasks: {
          checkout: null,
          bootstrap: null,
          build: null,
        },
      };
    }

    this.saveState({
      ...state,
      workspaces: {
        ...state.workspaces,
        [SOURCE_REPO_ID]: sourceRepoState,
      },
    });

    return new SourceRepoWorkspace(sourceRepoState, this, this.context);
  }

  async activateWorktree(ref: string): Promise<WorktreeWorkspace> {
    const state = await this.loadState();

    const existingEntry = Object.values(state.workspaces).find(
      (workspace): workspace is WorktreeWorkspaceState =>
        workspace.type === 'worktree' && workspace.ref === ref
    );

    if (existingEntry) {
      existingEntry.lastUsed = Date.now();

      await this.saveState(state);

      await ensureWorktree(this.context, { path: existingEntry.worktree.path, ref });

      return new WorktreeWorkspace(existingEntry, this, this.context);
    }

    const path = this.generateWorktreePath();

    const newEntry: WorktreeWorkspaceState = {
      id: path,
      lastUsed: Date.now(),
      ref,
      type: 'worktree',
      tasks: {
        checkout: null,
        bootstrap: null,
        build: null,
      },
      worktree: {
        path,
      },
    };

    await ensureWorktree(this.context, { path: newEntry.worktree.path, ref });

    await this.saveState({
      ...state,
      workspaces: {
        ...state.workspaces,
        [newEntry.worktree.path]: newEntry,
      },
    });

    await this.pruneIfNeeded(state);

    return new WorktreeWorkspace(newEntry, this, this.context);
  }

  async updateEntry<T extends WorkspaceState>(entry: T, mutate: (e: T) => void) {
    const state = await this.loadState();

    const current = state.workspaces[entry.id];

    if (current) {
      mutate(current as T);
      current.lastUsed = Date.now();
      await this.saveState(state);
    }
  }
}
