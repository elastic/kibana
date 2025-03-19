/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import inquirer from 'inquirer';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Commit, PullRequest } from '../types';
import { safeExec } from './exec';

export const findRemoteName = async (repo: string) => {
  const res = await safeExec('git remote -v', true, false);
  repo = repo.toLowerCase();
  const remotes = res.stdout
    .trim()
    .split('\n')
    .map((line) => line.split(/\t| /).filter(Boolean))
    .filter((chunks) => chunks.length >= 2);
  return remotes.find(
    ([, url]) =>
      url.toLowerCase().includes(`github.com/${repo}`) ||
      url.toLowerCase().includes(`github.com:${repo}`)
  )?.[0];
};

export const findGithubLogin = async () => {
  const res = await safeExec('gh auth status', true, false);
  // e.g. ✓ Logged in to github.com account gsoldevila (/Users/gsoldevila/.config/gh/hosts.yml)
  const loginLine = res.stdout
    .split('\n')
    .find((line) => line.includes('Logged in'))
    ?.split(/\t| /)
    .filter(Boolean);

  return loginLine?.[loginLine?.findIndex((fragment) => fragment === 'account') + 1];
};

export const findPr = async (number: string): Promise<PullRequest> => {
  const res = await safeExec(`gh pr view ${number} --json commits,headRefName`);
  return { ...JSON.parse(res.stdout), number };
};

export const isManualCommit = (commit: Commit) =>
  !commit.messageHeadline.startsWith('Relocating module ') &&
  !commit.messageHeadline.startsWith('Moving modules owned by ') &&
  !commit.messageHeadline.startsWith('Merge branch ') &&
  commit.authors.some(
    (author) => author.login !== 'kibanamachine' && author.login !== 'elasticmachine'
  );

export function getManualCommits(commits: Commit[]) {
  return commits.filter(isManualCommit);
}

export async function getLastCommitMessage() {
  return (await safeExec('git log -1 --pretty=%B')).stdout.split('\n')[0];
}

export async function resetAllCommits(numCommits: number) {
  await safeExec(`git reset --hard HEAD~${numCommits}`);

  let msg = await getLastCommitMessage();
  while (msg.startsWith('Relocating module ')) {
    await safeExec(`git reset --hard HEAD~1`);
    msg = await getLastCommitMessage();
  }
  await safeExec('git restore --staged .');
  await safeExec('git restore .');
  await safeExec('git clean -f -d');
}

export async function localBranchExists(branchName: string): Promise<boolean> {
  const res = await safeExec('git branch -l');
  const branches = res.stdout
    .split('\n')
    .filter(Boolean)
    .map((name) => name.trim());
  return branches.includes(branchName);
}

async function deleteBranches(...branchNames: string[]) {
  const res = await safeExec('git branch -l');
  const branches = res.stdout
    .split('\n')
    .filter(Boolean)
    .map((branchName) => branchName.trim());

  await Promise.all(
    branchNames
      .filter((toDelete) => branches.includes(toDelete))
      .map((toDelete) => safeExec(`git branch -D ${toDelete}`).catch(() => {}))
  );
}

export const checkoutResetPr = async (pr: PullRequest, baseBranch: string) => {
  // delete existing branch
  await deleteBranches(pr.headRefName);

  // checkout the PR branch
  await safeExec(`gh pr checkout ${pr.number}`);
  await resetAllCommits(pr.commits.length);
  await safeExec(`git rebase ${baseBranch}`);
};

export const checkoutBranch = async (branch: string) => {
  // create a new branch / PR
  if (await localBranchExists(branch)) {
    throw new Error('The local branch already exists, aborting!');
  } else {
    await safeExec(`git checkout -b ${branch}`);
  }
};

export const cherryPickManualCommits = async (pr: PullRequest, log: ToolingLog) => {
  const manualCommits = getManualCommits(pr.commits);
  if (manualCommits.length) {
    log.info(`Found manual commits on https://github.com/elastic/kibana/pull/${pr.number}/commits`);

    for (let i = 0; i < manualCommits.length; ++i) {
      const { oid, messageHeadline, authors } = manualCommits[i];
      const url = `https://github.com/elastic/kibana/pull/${pr.number}/commits/${oid}`;

      const res = await inquirer.prompt({
        type: 'list',
        choices: [
          { name: 'Yes, attempt to cherry-pick', value: 'yes' },
          { name: 'No, I will add it manually (press when finished)', value: 'no' },
        ],
        name: 'cherryPick',
        message: `Do you want to cherry pick '${messageHeadline}' (${authors[0].login})?`,
      });

      if (res.cherryPick === 'yes') {
        try {
          await safeExec(`git cherry-pick ${oid}`);
          log.info(`Commit '${messageHeadline}' (${authors[0].login}) cherry-picked successfully!`);
        } catch (error) {
          log.info(`Error trying to cherry-pick: ${url}`);
          log.error(error.message);
          const res2 = await inquirer.prompt({
            type: 'list',
            choices: [
              { name: 'Abort this cherry-pick', value: 'abort' },
              { name: 'Conflicts solved (git cherry-pick --continue)', value: 'continue' },
              { name: 'I solved the conflicts and commited', value: 'done' },
            ],
            name: 'cherryPickFailed',
            message: `Automatic cherry-pick failed, manual intervention required`,
          });

          if (res2.cherryPickFailed === 'abort') {
            try {
              await safeExec(`git cherry-pick --abort`);
              log.warning(
                'Cherry-pick aborted, please review changes in that commit and apply them manually if needed!'
              );
            } catch (error2) {
              log.error(
                'Cherry-pick --abort failed, please cleanup your working tree before continuing!'
              );
            }
          } else if (res2.cherryPickFailed === 'continue') {
            try {
              await safeExec(`git cherry-pick --continue`);
              log.info(
                `Commit '${messageHeadline}' (${authors[0].login}) cherry-picked successfully!`
              );
            } catch (error2) {
              await inquirer.prompt({
                type: 'confirm',
                name: 'cherryPickContinueFailed',
                message: `Cherry pick --continue failed, please address conflicts AND COMMIT manually. Hit confirm when ready`,
              });
            }
          }
        }
      }
    }
  }
};
