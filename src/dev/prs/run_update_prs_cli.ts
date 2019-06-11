/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';

import * as Rx from 'rxjs';
import execa from 'execa';
import chalk from 'chalk';
import { first, tap } from 'rxjs/operators';
import dedent from 'dedent';

import { getLine$ } from './helpers';
import { run, createFlagError } from '../run';
import { Pr } from './pr';
import { GithubApi } from './github_api';

const UPSTREAM_URL = 'git@github.com:elastic/kibana.git';

run(
  async ({ flags, log }) => {
    /**
     * Start off by consuming the necessary flags so that errors from invalid
     * flags can be thrown before anything serious is done
     */
    const accessToken = flags['access-token'];
    if (typeof accessToken !== 'string' && accessToken !== undefined) {
      throw createFlagError('invalid --access-token, expected a single string');
    }

    const repoDir = flags['repo-dir'];
    if (typeof repoDir !== 'string') {
      throw createFlagError('invalid --repo-dir, expected a single string');
    }

    const prNumbers = flags._.map(arg => Pr.parseInput(arg));

    /**
     * Call the Gitub API once for each PR to get the targetRef so we know which branch to pull
     * into that pr
     */
    const api = new GithubApi(accessToken);
    const prs = await Promise.all(
      prNumbers.map(async prNumber => {
        const { targetRef, owner, sourceBranch } = await api.getPrInfo(prNumber);
        return new Pr(prNumber, targetRef, owner, sourceBranch);
      })
    );

    const execInDir = async (cmd: string, args: string[]) => {
      log.debug(`$ ${cmd} ${args.join(' ')}`);

      const proc = execa(cmd, args, {
        cwd: repoDir,
        stdio: ['inherit', 'pipe', 'pipe'],
      } as any);

      await Promise.all([
        proc.then(() => log.debug(` - ${cmd} exited with 0`)),
        Rx.merge(getLine$(proc.stdout), getLine$(proc.stderr))
          .pipe(tap(line => log.debug(line)))
          .toPromise(),
      ]);
    };

    const init = async () => {
      // ensure local repo is initialized
      await execa('git', ['init', repoDir]);

      try {
        // attempt to init upstream remote
        await execInDir('git', ['remote', 'add', 'upstream', UPSTREAM_URL]);
      } catch (error) {
        if (error.code !== 128) {
          throw error;
        }

        // remote already exists, update its url
        await execInDir('git', ['remote', 'set-url', 'upstream', UPSTREAM_URL]);
      }
    };

    const updatePr = async (pr: Pr) => {
      log.info('Fetching...');
      await execInDir('git', [
        'fetch',
        'upstream',
        '-fun',
        `pull/${pr.number}/head:${pr.sourceBranch}`,
      ]);
      await execInDir('git', ['reset', '--hard']);
      await execInDir('git', ['clean', '-fd']);

      log.info('Checking out %s:%s locally', pr.owner, pr.sourceBranch);
      await execInDir('git', ['checkout', pr.sourceBranch]);

      try {
        log.info('Pulling in changes from elastic:%s', pr.targetRef);
        await execInDir('git', ['pull', 'upstream', pr.targetRef, '--no-edit']);
      } catch (error) {
        if (!error.stdout.includes('Automatic merge failed;')) {
          throw error;
        }

        const resolveConflicts = async () => {
          log.error(chalk.red('Conflict resolution required'));
          log.info(
            dedent(chalk`
              Please resolve the merge conflicts in ${repoDir} in another terminal window.
              Once the conflicts are resolved run the following in the other window:

                git commit --no-edit

              {bold hit the enter key when complete}
            `) + '\n'
          );

          await getLine$(process.stdin)
            .pipe(first())
            .toPromise();

          try {
            await execInDir('git', ['diff-index', '--quiet', 'HEAD', '--']);
          } catch (_) {
            log.error(`Uncommitted changes in ${repoDir}`);
            await resolveConflicts();
          }
        };

        await resolveConflicts();
      }

      log.info('Pushing changes to %s:%s', pr.owner, pr.sourceBranch);
      await execInDir('git', [
        'push',
        `git@github.com:${pr.owner}/kibana.git`,
        `HEAD:${pr.sourceBranch}`,
      ]);

      log.success('updated');
    };

    await init();
    for (const pr of prs) {
      log.info('pr #%s', pr.number);
      log.indent(4);
      try {
        await updatePr(pr);
      } finally {
        log.indent(-4);
      }
    }
  },
  {
    description: 'Update github PRs with the latest changes from their base branch',
    usage: 'node scripts/update_prs number [...numbers]',
    flags: {
      string: ['repo-dir', 'access-token'],
      default: {
        'repo-dir': resolve(__dirname, '../../../data/.update_prs'),
      },
    },
  }
);
