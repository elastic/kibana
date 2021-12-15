import chalk from 'chalk';
import inquirer, {
  CheckboxQuestion,
  ListQuestion,
  ConfirmQuestion,
} from 'inquirer';
import { isEmpty } from 'lodash';
import { TargetBranchChoice } from '../options/ConfigOptions';
import { getShortSha } from './github/commitFormatters';
import { Commit } from './sourceCommit';

type Question = CheckboxQuestion | ListQuestion | ConfirmQuestion;

async function prompt<T = unknown>(options: Question) {
  const { promptResult } = (await inquirer.prompt([
    { ...options, name: 'promptResult' },
  ])) as { promptResult: T };
  return promptResult;
}

export async function promptForCommits({
  commitChoices,
  isMultipleChoice,
}: {
  commitChoices: Commit[];
  isMultipleChoice: boolean;
}): Promise<Commit[]> {
  const choices = commitChoices.map((c, i) => {
    const existingPRs = c.targetBranchesFromLabels.expected
      .map((branch) => {
        const isMerged = c.targetBranchesFromLabels.merged.includes(branch);
        if (isMerged) {
          return chalk.green(branch);
        }

        const isUnmerged = c.targetBranchesFromLabels.unmerged.includes(branch);
        if (isUnmerged) {
          return chalk.gray(branch);
        }

        const isMissing = c.targetBranchesFromLabels.missing.includes(branch);
        if (isMissing) {
          return chalk.red(branch);
        }
      })
      .join(', ');

    const position = chalk.gray(`${i + 1}.`);

    return {
      name: `${position} ${c.formattedMessage} ${existingPRs}`,
      short: c.pullNumber
        ? `#${c.pullNumber} (${getShortSha(c.sha)})`
        : getShortSha(c.sha),
      value: c,
    };
  });

  const res = await prompt<Commit[]>({
    loop: false,
    pageSize: 15,
    choices: choices,
    message: 'Select commit',
    type: isMultipleChoice ? 'checkbox' : 'list',
  });

  const selectedCommits = Array.isArray(res) ? res.reverse() : [res];
  return isEmpty(selectedCommits)
    ? promptForCommits({ commitChoices: commitChoices, isMultipleChoice })
    : selectedCommits;
}

export async function promptForTargetBranches({
  targetBranchChoices,
  isMultipleChoice,
}: {
  targetBranchChoices: TargetBranchChoice[];
  isMultipleChoice: boolean;
}): Promise<string[]> {
  const res = await prompt<string | string[]>({
    loop: false,
    pageSize: 15,
    choices: targetBranchChoices,
    message: 'Select branch',
    type: isMultipleChoice ? 'checkbox' : 'list',
  });

  const selectedBranches = Array.isArray(res) ? res : [res];

  return isEmpty(selectedBranches)
    ? promptForTargetBranches({
        targetBranchChoices,
        isMultipleChoice,
      })
    : selectedBranches;
}

export function confirmPrompt(message: string) {
  return prompt<boolean>({ message, type: 'confirm' });
}
