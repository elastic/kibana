/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { RepoConfig, RepoConfigs } from '../model/workspace';

export class ServerOptions {
  public static DEFAULT_MAX_WORKSPACE = 5;

  public readonly workspacePath = resolve(this.config.get('path.data'), 'codesearch/workspace');

  public readonly repoPath = resolve(this.config.get('path.data'), 'codesearch/repos');

  public readonly updateFrequencyMs: number = this.options.updateFreqencyMs;

  public readonly lspRequestTimeout: number = this.options.lspRequestTimeout;

  public readonly maxWorkspace: number =
    this.options.maxWorkspace || ServerOptions.DEFAULT_MAX_WORKSPACE;

  public readonly repoConfigs: RepoConfigs = (this.options.repos as RepoConfig[]).reduce(
    (previous, current) => {
      previous[current.repo] = current;
      return previous;
    },
    {} as RepoConfigs
  );

  constructor(private options: any, private config: any) {}
}
