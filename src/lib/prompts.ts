import inquirer, { Question } from 'inquirer';
import isEmpty from 'lodash.isempty';
import { Commit, BranchChoice } from '../types/types';

async function prompt<T>(options: Question) {
  const { promptResult } = (await inquirer.prompt([
    { ...options, name: 'promptResult' }
  ])) as { promptResult: T };
  return promptResult;
}

export function listProjects(repoNames: string[]) {
  return prompt({
    choices: repoNames,
    message: 'Select project',
    type: 'list'
  });
}

export async function listCommits(
  commits: Commit[],
  isMultipleChoice: boolean
): Promise<Commit[]> {
  const choices = commits.map((c, i) => ({
    name: `${i + 1}. ${c.message}`,
    short: c.message,
    value: c
  }));

  const res = await prompt({
    choices,
    message: 'Select commit to backport',
    pageSize: Math.min(10, commits.length),
    type: isMultipleChoice ? 'checkbox' : 'list'
  });

  const selectedCommits = Array.isArray(res) ? res.reverse() : [res];
  return isEmpty(selectedCommits)
    ? listCommits(commits, isMultipleChoice)
    : selectedCommits;
}

export async function listBranches(
  branches: BranchChoice[],
  isMultipleChoice: boolean
): Promise<string[]> {
  const res = await prompt<string | string[]>({
    choices: branches,
    message: 'Select branch to backport to',
    type: isMultipleChoice ? 'checkbox' : 'list'
  });

  const selectedBranches = Array.isArray(res) ? res : [res];

  return isEmpty(selectedBranches)
    ? listBranches(branches, isMultipleChoice)
    : selectedBranches;
}

export function confirmConflictResolved() {
  return prompt({
    message: 'Press enter when you have commited all changes',
    type: 'confirm'
  });
}
