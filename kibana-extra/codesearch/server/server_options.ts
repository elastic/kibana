/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

export class ServerOptions {
  public readonly workspacePath = resolve(this.config.get('path.data'), 'codesearch/workspace');

  public readonly repoPath = resolve(this.config.get('path.data'), 'codesearch/repos');

  public readonly updateFrequencyMs: number = this.options.updateFreqencyMs;

  public readonly lspRequestTimeout: number = this.options.lspRequestTimeout;

  constructor(private options: any, private config: any) {}
}
