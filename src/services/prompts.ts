import chalk from 'chalk';
import inquirer, {
  CheckboxQuestion,
  ListQuestion,
  ConfirmQuestion,
} from 'inquirer';
import { isEmpty, repeat } from 'lodash';
import terminalLink from 'terminal-link';
import { TargetBranchChoice } from '../options/ConfigOptions';
import {
  stripPullNumber,
  getFirstLine,
  getShortSha,
} from './github/commitFormatters';
import { ExpectedTargetPullRequest } from './sourceCommit/getExpectedTargetPullRequests';
import { Commit } from './sourceCommit/parseSourceCommit';

type Question = CheckboxQuestion | ListQuestion | ConfirmQuestion;

async function prompt<T = unknown>(options: Question) {
  const { promptResult } = (await inquirer.prompt([
    { ...options, name: 'promptResult' },
  ])) as { promptResult: T };
  return promptResult;
}

function getPrStateIcon(state: ExpectedTargetPullRequest['state']) {
  if (state === 'MERGED') {
    return '🟢';
  }

  if (state === 'MISSING') {
    return '🔴';
  }

  if (state === 'OPEN') {
    return '🔵';
  }

  // unknown state
  return '🔴';
}

function getPrStateText(state: ExpectedTargetPullRequest['state']) {
  if (state === 'MERGED') {
    return chalk.gray('Merged');
  }

  if (state === 'MISSING') {
    return chalk.gray('Backport missing');
  }

  if (state === 'OPEN') {
    return chalk.gray('Open, not merged');
  }

  return chalk.gray('Unknown state');
}

function getPrLink(number?: number, url?: string) {
  return url ? `(${terminalLink(`#${number}`, url)})` : '';
}

function getDetailedPullStatus(c: Commit) {
  const items = c.expectedTargetPullRequests.map((pr) => {
    const prLink = getPrLink(pr.number, pr.url);
    return `     └ ${getPrStateIcon(pr.state)} ${
      pr.branch
    } ${prLink} ${getPrStateText(pr.state)}`;
  });

  const list =
    items.length > 0
      ? `\n${chalk.reset(items.join('\n'))}`
      : `\n     └ ${chalk.gray('No backports expected')}`;

  return `${list}\n`;
}

function getSimplePullStatus(c: Commit) {
  return c.expectedTargetPullRequests
    .map(({ state, branch }) => {
      if (state === 'MERGED') {
        return chalk.green(branch);
      }

      if (state === 'MISSING') {
        return chalk.red(branch);
      }

      if (state === 'OPEN') {
        return chalk.gray(branch);
      }

      return chalk.gray('Unknown state');
    })
    .join(', ');
}

export function getChoicesForCommitPrompt(
  commits: Commit[],
  showDetails: boolean
) {
  return commits.map((c, i) => {
    const leadingWhitespace = repeat(' ', 2 - (i + 1).toString().length);
    const position = chalk.gray(`${i + 1}.${leadingWhitespace}`);

    let name;
    if (showDetails) {
      const message = stripPullNumber(c.originalMessage);
      const prLink = c.pullUrl ? ` ` + getPrLink(c.pullNumber, c.pullUrl) : '';
      const detailsList = getDetailedPullStatus(c);
      name = `${position}${message}${prLink}${detailsList}`;
    } else {
      const message = getFirstLine(c.originalMessage);
      const pullStates = getSimplePullStatus(c);
      name = `${position}${message} ${pullStates}`;
    }

    const short = c.pullNumber
      ? `#${c.pullNumber} (${getShortSha(c.sha)})`
      : getShortSha(c.sha);

    return { name, short, value: c };
  });
}

export async function promptForCommits({
  commitChoices,
  isMultipleChoice,
  showDetails,
}: {
  commitChoices: Commit[];
  isMultipleChoice: boolean;
  showDetails: boolean;
}): Promise<Commit[]> {
  const choices = getChoicesForCommitPrompt(commitChoices, showDetails);

  const res = await prompt<Commit | Commit[]>({
    loop: false,
    pageSize: 30,
    choices: choices,
    message: 'Select commit',
    type: isMultipleChoice ? 'checkbox' : 'list',
  });

  const selectedCommits = Array.isArray(res) ? res.reverse() : [res];
  return isEmpty(selectedCommits)
    ? promptForCommits({ commitChoices, isMultipleChoice, showDetails })
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
