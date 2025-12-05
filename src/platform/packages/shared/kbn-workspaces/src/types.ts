/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ExecaReturnValue } from 'execa';

// User-provided settings controlling where workspaces are created and limits.
export interface WorkspaceSettings {
  repoRoot?: string; // absolute path to the canonical kibana repo clone
  workspacesRoot?: string; // absolute path to directory where worktrees + metadata are stored
  maxWorkspaces?: number; // optional override of limit
}

export interface InternalWorkspaceSettings {
  maxWorkspaces: number;
}

export interface WorkspaceGlobalContext {
  log: ToolingLog;
  repoRoot: string;
  workspacesRoot: string;
  baseCloneDir: string;
  stateFilepath: string;
  settings: {
    maxWorkspaces: number;
  };
}

export interface WorkspaceTasksState {
  checkout: { cacheKey: string } | null;
  bootstrap: { cacheKey: string } | null;
  build: { cacheKey: string } | null;
}

interface WorkspaceStateBase {
  type: string;
  id: string;
  tasks: WorkspaceTasksState;
  lastUsed: number;
}

export interface WorktreeWorkspaceState extends WorkspaceStateBase {
  type: 'worktree';
  worktree: Worktree;
  ref: string;
}

export interface SourceRepoWorkspaceState extends WorkspaceStateBase {
  type: 'source_repo';
  dir: string;
}

export type WorkspaceState = WorktreeWorkspaceState | SourceRepoWorkspaceState;

export interface Worktree {
  path: string;
}

export interface WorkspaceGlobalState {
  workspaces: Record<string, WorkspaceState>;
}

export interface IWorkspace {
  ensureCheckout(): Promise<void>;
  ensureBootstrap(): Promise<void>;
  ensureBuild(): Promise<void>;
  getDisplayName(): string;
  getCommitLine(): Promise<string>;
  getDir(): string;
  exec: Exec;
}

export interface ExecOptions {
  log: ToolingLog;
  cwd?: string;
  env?: Record<string, string>;
  buffer?: boolean;
}

export interface Exec {
  (command: string, options: ExecOptions): Promise<ExecaReturnValue<string>>;
  (file: string, args: string[], options: ExecOptions): Promise<ExecaReturnValue<string>>;
}
