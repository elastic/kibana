/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { RepoConfig, RepoConfigs } from '../model/workspace';

export class ServerOptions {
  public readonly workspacePath = resolve(this.config.get('path.data'), 'code/workspace');

  public readonly repoPath = resolve(this.config.get('path.data'), 'code/repos');

  public readonly jdtWorkspacePath = resolve(this.config.get('path.data'), 'code/jdt_ws');

  public readonly updateFrequencyMs: number = this.options.updateFreqencyMs;

  public readonly indexFrequencyMs: number = this.options.indexFrequencyMs;

  public readonly updateRepoFrequencyMs: number = this.options.updateRepoFrequencyMs;

  public readonly indexRepoFrequencyMs: number = this.options.indexRepoFrequencyMs;

  public readonly lspRequestTimeout: number = this.options.lspRequestTimeout;

  public readonly maxWorkspace: number = this.options.maxWorkspace;

  // This is a temporary config item.
  public readonly isAdmin: boolean = this.options.isAdmin;
  public readonly disableScheduler: boolean = this.options.disableScheduler;

  public readonly enableGlobalReference: boolean = this.options.enableGlobalReference;

  public readonly repoConfigs: RepoConfigs = (this.options.repos as RepoConfig[]).reduce(
    (previous, current) => {
      previous[current.repo] = current;
      return previous;
    },
    {} as RepoConfigs
  );

  constructor(private options: any, private config: any) {}
}
