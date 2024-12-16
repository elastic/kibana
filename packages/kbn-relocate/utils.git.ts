/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import inquirer from 'inquirer';
import type { Commit, PullRequest } from './types';
import { safeExec } from './utils.exec';

export const findPr = async (number: string): Promise<PullRequest> => {
  const res = await safeExec(`gh pr view ${number} --json commits,headRefName`);
  return { ...JSON.parse(res.stdout), number };
};

export function hasManualCommits(commits: Commit[]) {
  const manualCommits = commits.filter(
    (commit) =>
      !commit.messageHeadline.startsWith('Relocating module ') &&
      !commit.messageHeadline.startsWith('Moving modules owned by ') &&
      commit.authors.some(
        (author) => author.login !== 'kibanamachine' && author.login !== 'elasticmachine'
      )
  );

  return manualCommits.length > 0;
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

export const checkoutResetPr = async (baseBranch: string, prNumber: string): Promise<boolean> => {
  const pr = await findPr(prNumber);

  if (hasManualCommits(pr.commits)) {
    const res = await inquirer.prompt({
      type: 'confirm',
      name: 'overrideManualCommits',
      message: 'Detected manual commits in the PR, do you want to override them?',
    });
    if (!res.overrideManualCommits) {
      return false;
    }
  }

  // previous cleanup on current branch
  await safeExec(`git restore --staged .`);
  await safeExec(`git restore .`);
  await safeExec(`git clean -f -d`);

  // delete existing branch
  await deleteBranches(pr.headRefName);

  // checkout the PR branch
  await safeExec(`gh pr checkout ${prNumber}`);
  await resetAllCommits(pr.commits.length);
  await safeExec(`git rebase ${baseBranch}`);
  return true;
};

export const checkoutBranch = async (branch: string) => {
  // create a new branch / PR
  if (await localBranchExists(branch)) {
    throw new Error('The local branch already exists, aborting!');
  } else {
    await safeExec(`git checkout -b ${branch}`);
  }
};
