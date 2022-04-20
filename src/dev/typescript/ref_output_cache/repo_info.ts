/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';

export class RepoInfo {
  constructor(
    private readonly log: ToolingLog,
    private readonly dir: string,
    private readonly upstreamUrl: string
  ) {}

  async getRecentShasFrom(sha: string, size: number) {
    return (await this.git(['log', '--pretty=%P', `-n`, `${size}`, sha]))
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  async getMergeBase(ref: string, upstreamBranch: string) {
    this.log.info('ensuring we have the latest changelog from upstream', upstreamBranch);
    await this.git(['fetch', this.upstreamUrl, upstreamBranch]);

    this.log.info('determining merge base with upstream');

    const mergeBase = await this.git(['merge-base', ref, 'FETCH_HEAD']);
    this.log.info('merge base with', upstreamBranch, 'is', mergeBase);

    return mergeBase;
  }

  async getHeadSha() {
    return await this.git(['rev-parse', 'HEAD']);
  }

  getRelative(path: string) {
    return Path.relative(this.dir, path);
  }

  private async git(args: string[]) {
    const proc = await execa('git', args, {
      cwd: this.dir,
    });

    return proc.stdout.trim();
  }

  async getFilesChangesSinceSha(sha: string) {
    this.log.debug('determining files changes since sha', sha);

    const proc = await execa('git', ['diff', '--name-only', sha], {
      cwd: this.dir,
    });
    const files = proc.stdout
      .trim()
      .split('\n')
      .map((p) => Path.resolve(this.dir, p));

    this.log.verbose('found the following changes compared to', sha, `\n - ${files.join('\n - ')}`);

    return files;
  }
}
