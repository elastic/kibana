const inquirer = require('inquirer');
const isEmpty = require('lodash.isempty');

async function prompt(options) {
  const { promptResult } = await inquirer.prompt([
    { ...options, name: 'promptResult' }
  ]);
  return promptResult;
}

function listProjects(repoNames) {
  return prompt({
    type: 'list',
    message: 'Select project',
    choices: repoNames
  });
}

async function listCommits(commits, isMultipleChoice) {
  const pageSize = Math.min(10, commits.length);
  const res = await prompt({
    pageSize,
    type: isMultipleChoice ? 'checkbox' : 'list',
    message: 'Select commit to backport',
    choices: commits
      .map(c => ({
        name: c.message,
        value: c,
        short: c.message
      }))
      .concat(commits.length > pageSize ? new inquirer.Separator() : [])
  });

  const selectedCommits = isMultipleChoice ? res.reverse() : [res];

  return isEmpty(selectedCommits)
    ? listCommits(commits, isMultipleChoice)
    : selectedCommits;
}

async function listBranches(branches, isMultipleChoice) {
  const res = await prompt({
    type: isMultipleChoice ? 'checkbox' : 'list',
    message: 'Select branch to backport to',
    choices: branches
  });

  const selectedBranches = isMultipleChoice ? res : [res];

  return isEmpty(selectedBranches)
    ? listBranches(branches, isMultipleChoice)
    : selectedBranches;
}

function confirmConflictResolved() {
  return prompt({
    type: 'confirm',
    message: 'Press enter when you have commited all changes'
  });
}

module.exports = {
  confirmConflictResolved,
  listCommits,
  listProjects,
  listBranches
};
