const inquirer = require('inquirer');
const isEmpty = require('lodash.isempty');

function prompt(options) {
  return inquirer
    .prompt([Object.assign({}, options, { name: 'promptResult' })])
    .then(({ promptResult }) => promptResult);
}

function listProjects(repoNames) {
  return prompt({
    type: 'list',
    message: 'Select project',
    choices: repoNames
  });
}

function listCommits(commits, isMultipleChoice) {
  const pageSize = Math.min(10, commits.length);
  return prompt({
    pageSize,
    type: isMultipleChoice ? 'checkbox' : 'list',
    message: 'Select commit to backport',
    choices: commits
      .map(commit => ({
        name: commit.message,
        value: commit,
        short: commit.message
      }))
      .concat(commits.length > pageSize ? new inquirer.Separator() : [])
  })
    .then(commit => (isMultipleChoice ? commit.reverse() : [commit]))
    .then(
      selectedCommits =>
        isEmpty(selectedCommits)
          ? listCommits(commits, isMultipleChoice)
          : selectedCommits
    );
}

function listBranches(branches, isMultipleChoice) {
  return prompt({
    type: isMultipleChoice ? 'checkbox' : 'list',
    message: 'Select branch to backport to',
    choices: branches
  })
    .then(res => (isMultipleChoice ? res : [res]))
    .then(
      selectedBranches =>
        isEmpty(selectedBranches)
          ? listBranches(branches, isMultipleChoice)
          : selectedBranches
    );
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
