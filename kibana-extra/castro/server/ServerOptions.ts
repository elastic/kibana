/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import os from 'os';
import Path from 'path';

export default class ServerOptions {
  private options: any;
  constructor(options: any) {
    this.options = options;
  }
  public get workspacePath(): string {
    return Path.join(this.dataPath, 'workspace');
  }

  public get repoPath(): string {
    return Path.join(this.dataPath, 'repos');
  }

  public get dataPath(): string {
    const dataPath = this.options.dataPath;
    if (dataPath.startsWith('/')) {
      return dataPath;
    } else {
      return Path.resolve(os.homedir(), dataPath);
    }
  }
}
