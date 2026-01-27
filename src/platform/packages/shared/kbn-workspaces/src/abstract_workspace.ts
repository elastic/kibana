/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import objectHash from 'object-hash';
import type { ExecaReturnValue } from 'execa';
import { bootstrap } from './bootstrap';
import type { BuildOptions } from './build';
import { build } from './build';
import type {
  IWorkspace,
  ExecOptions,
  WorkspaceGlobalContext,
  WorkspaceState,
  WorkspaceTasksState,
} from './types';
import type { WorkspaceController } from './workspace_controller';
import { exec } from './exec';

interface AbstractWorkspaceState {
  dir: string;
  tasks: WorkspaceTasksState;
}

export abstract class AbstractWorkspace implements IWorkspace {
  constructor(
    protected readonly state: AbstractWorkspaceState,
    protected readonly controller: WorkspaceController,
    protected readonly context: WorkspaceGlobalContext
  ) {}

  protected abstract getCacheKey(): Promise<string>;

  protected abstract getState(): WorkspaceState;

  public abstract getDisplayName(): string;

  public getDir(): string {
    return this.state.dir;
  }

  async ensureBootstrap(): Promise<void> {
    const cacheKey = await this.getCacheKey();

    if (this.state.tasks.bootstrap?.cacheKey === cacheKey) {
      return;
    }

    await this.ensureCheckout();

    await bootstrap({
      log: this.context.log,
      dir: this.state.dir,
    });

    this.state.tasks.bootstrap = { cacheKey };
    this.state.tasks.build = null;

    await this.controller.updateEntry(this.getState(), (e) => {
      e.tasks.bootstrap = { cacheKey };
      e.tasks.build = null;
    });
  }

  async ensureBuild(options?: BuildOptions): Promise<void> {
    const cacheKey = [await this.getCacheKey(), objectHash(options ?? {})].join('');

    if (this.state.tasks.build?.cacheKey === cacheKey) {
      return;
    }

    await this.ensureBootstrap();

    await build({
      log: this.context.log,
      dir: this.getDir(),
      options,
    });

    this.state.tasks.build = { cacheKey };

    await this.controller.updateEntry(this.getState(), (e) => {
      e.tasks.build = { cacheKey };
    });
  }

  async ensureCheckout(): Promise<void> {}

  exec(file: string, args: string[], options: ExecOptions): Promise<ExecaReturnValue<string>>;
  exec(command: string, options: ExecOptions): Promise<ExecaReturnValue<string>>;
  exec(
    ...args: [string, ExecOptions] | [string, string[], ExecOptions]
  ): Promise<ExecaReturnValue<string>> {
    if (args.length === 3) {
      return exec(args[0], args[1], {
        ...args[2],
        cwd: this.getDir(),
      });
    }
    return exec(args[0], {
      ...args[1],
      cwd: this.getDir(),
    });
  }

  async getCommitLine(): Promise<string> {
    const { stdout } = await this.exec('git', ['show', '-s', '--pretty=%s', 'HEAD'], {
      log: this.context.log,
      cwd: this.getDir(),
    });
    return stdout;
  }
}
