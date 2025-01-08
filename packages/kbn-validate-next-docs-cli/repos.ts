/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import Rl from 'readline';

import Chalk from 'chalk';
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';

import { quietFail } from './error';

function lines(read: NodeJS.ReadableStream) {
  return Rl.createInterface({
    input: read,
    crlfDelay: Infinity,
  });
}

function getGithubBase(log: ToolingLog) {
  try {
    const originUrl = execa.sync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).stdout;

    if (originUrl.startsWith('git@')) {
      log.warning('using ssh urls for Github repos');
      return `git@github.com:`;
    }
  } catch {
    // noop
  }

  if (process.env.GITHUB_TOKEN) {
    log.warning('using https urls for Github repos (with token)');
    return `https://token:${process.env.GITHUB_TOKEN}@github.com/`;
  }

  log.warning('using https urls for Github repos');
  return `https://github.com/`;
}

export class Repo {
  constructor(
    private readonly log: ToolingLog,
    private readonly name: string,
    private readonly dir: string,
    private readonly githubBase: string
  ) {}

  resolve(...segs: string[]) {
    return Path.resolve(this.dir, ...segs);
  }

  exists() {
    if (!Fs.existsSync(this.dir)) {
      return false;
    }

    if (!Fs.statSync(this.dir).isDirectory()) {
      throw new Error(`[${this.name}] directory exists but it's not a directory like it should be`);
    }

    return true;
  }

  async run(cmd: string, args: string[], opts: { desc: string; showOutput?: boolean }) {
    try {
      if (!opts.showOutput) {
        await execa(cmd, args, {
          cwd: this.dir,
          maxBuffer: Infinity,
        });
        return;
      }

      await this.log.indent(4, async () => {
        const proc = execa(cmd, args, {
          cwd: this.dir,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        await Promise.all([
          (async () => {
            for await (const line of lines(proc.stdout!)) {
              this.log.write(Chalk.dim('out '), line);
            }
          })(),
          (async () => {
            for await (const line of lines(proc.stderr!)) {
              this.log.write(Chalk.red('err '), line);
            }
          })(),
          new Promise((resolve, reject) => {
            proc.once('exit', resolve).once('exit', reject);
          }),
        ]);
      });
    } catch (error) {
      this.log.debug(
        `Failed to run [${opts.desc}] in [${this.name}]`,
        opts.showOutput ? error : undefined
      );

      throw quietFail(`${this.name}: ${opts.desc} failed`);
    }
  }

  async update() {
    try {
      this.log.info('updating', this.name);
      await this.run('git', ['reset', '--hard'], { desc: 'git reset --hard' });
      await this.run(
        'git',
        [
          'clean',
          '-fdx',
          ...(this.name === 'elastic/docs.elastic.dev'
            ? ['-e', '/.docsmobile', '-e', '/node_modules']
            : []),
        ],
        { desc: 'git clean -fdx' }
      );
      await this.run('git', ['pull'], { desc: 'git pull' });
    } catch {
      quietFail(`failed to update ${this.name}`);
    }
  }

  async clone() {
    try {
      this.log.info('cloning', this.name);
      Fs.mkdirSync(this.dir, { recursive: true });
      const depth = process.env.CI ? ['--depth', '1'] : [];
      await this.run('git', ['clone', ...depth, `${this.githubBase}${this.name}.git`, '.'], {
        desc: 'git clone ...',
      });
    } catch {
      quietFail(`Failed to clone ${this.name}`);
    }
  }
}

export class Repos {
  githubBase: string;
  repoDir = Path.resolve(Os.userInfo().homedir, '.cache/next-docs/repos');

  constructor(private readonly log: ToolingLog) {
    this.githubBase = getGithubBase(this.log);
  }

  async init(repoName: string) {
    const repo = new Repo(
      this.log,
      repoName,
      Path.resolve(this.repoDir, repoName),
      this.githubBase
    );

    if (repo.exists()) {
      await repo.update();
    } else {
      await repo.clone();
    }

    return repo;
  }
}
