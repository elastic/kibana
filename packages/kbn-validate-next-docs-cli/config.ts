/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';

import { Repo } from './repos';

export interface Source {
  type: string;
  location: string;
  subdirs?: string[];
}

export class Config {
  path: string;
  backupPath: string;

  constructor(private readonly repo: Repo) {
    this.path = this.repo.resolve('config/content.js');
    this.backupPath = `${this.path}.backup`;
    this.restore();
  }

  private read(): { content: { sources: Source[]; nav: unknown } } {
    delete require.cache[this.path];
    return require(this.path);
  }

  private restore() {
    if (Fs.existsSync(this.backupPath)) {
      Fs.renameSync(this.backupPath, this.path);
    }
  }

  getSources() {
    return this.read().content.sources;
  }

  setSources(sources: Source[]) {
    this.restore();
    Fs.copyFileSync(this.path, this.backupPath);

    const current = this.read();

    Fs.writeFileSync(
      this.path,
      `module.exports = ${JSON.stringify(
        {
          content: {
            ...current.content,
            sources,
          },
        },
        null,
        2
      )}`
    );
  }
}
