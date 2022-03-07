/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import * as Rx from 'rxjs';
import execa from 'execa';
import chalk from 'chalk';
import { first, tap } from 'rxjs/operators';
import dedent from 'dedent';

import { run, createFlagError } from '@kbn/dev-utils';
import { getLine$ } from './helpers';
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

    const prNumbers = flags._.map((arg) => Pr.parseInput(arg));

    /**
     * Call the Gitub API once for each PR to get the targetRef so we know which branch to pull
     * into that pr
     */
    const api = new GithubApi(accessToken);
    const prs = await Promise.all(
      prNumbers.map(async (prNumber) => {
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
        Rx.merge(
          getLine$(proc.stdout!), // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
          getLine$(proc.stderr!) // TypeScript note: As long as the proc stdio[2] is 'pipe', then stderr will not be null
        )
          .pipe(tap((line) => log.debug(line)))
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
        if (error.exitCode !== 128) {
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

          await getLine$(process.stdin).pipe(first()).toPromise();

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
      await log.indent(4, async () => {
        await updatePr(pr);
      });
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
