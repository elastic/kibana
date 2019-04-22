import inquirer, { Question } from 'inquirer';
import isEmpty from 'lodash.isempty';
import { BranchChoice } from '../options/config/projectConfig';
import { Commit } from './github';

async function prompt<T = never>(options: Question) {
  const { promptResult } = (await inquirer.prompt([
    { ...options, name: 'promptResult' }
  ])) as { promptResult: T };
  return promptResult;
}

export async function promptForCommits(
  commits: Commit[],
  isMultipleChoice: boolean
): Promise<Commit[]> {
  const choices = commits.map((c, i) => ({
    name: `${i + 1}. ${c.message}`,
    short: c.message,
    value: c
  }));

  const res = await prompt<Commit[]>({
    choices,
    message: 'Select commit to backport',
    pageSize: Math.min(10, commits.length),
    type: isMultipleChoice ? 'checkbox' : 'list'
  });

  const selectedCommits = Array.isArray(res) ? res.reverse() : [res];
  return isEmpty(selectedCommits)
    ? promptForCommits(commits, isMultipleChoice)
    : selectedCommits;
}

export async function promptForBranches(
  branchChoices: BranchChoice[],
  isMultipleChoice: boolean
): Promise<string[]> {
  const res = await prompt<string | string[]>({
    choices: branchChoices,
    message: 'Select branch to backport to',
    type: isMultipleChoice ? 'checkbox' : 'list'
  });

  const selectedBranches = Array.isArray(res) ? res : [res];

  return isEmpty(selectedBranches)
    ? promptForBranches(branchChoices, isMultipleChoice)
    : selectedBranches;
}

export function confirmPrompt(message: string) {
  return prompt<boolean>({ message, type: 'confirm' });
}
