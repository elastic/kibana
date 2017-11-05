const inquirer = require('inquirer');

function prompt(options) {
  return inquirer
    .prompt([Object.assign({}, options, { name: 'promptResult' })])
    .then(({ promptResult }) => promptResult);
}

function listFullRepoName(repoNames) {
  return prompt({
    type: 'list',
    message: 'Select repository',
    choices: repoNames
  });
}

function listCommits(commits) {
  const pageSize = Math.min(10, commits.length);
  return prompt({
    pageSize,
    type: 'list',
    message: 'Select commit to backport',
    choices: commits
      .map(commit => ({
        name: commit.message,
        value: commit,
        short: commit.message
      }))
      .concat(commits.length > pageSize ? new inquirer.Separator() : [])
  });
}

function listVersions(versions) {
  return prompt({
    type: 'list',
    message: 'Select version to backport to',
    choices: versions
  }).then(version => [version]);
}

function checkboxVersions(versions) {
  return prompt({
    type: 'checkbox',
    message: 'Select version to backport to',
    choices: versions
  });
}

function confirmConflictResolved() {
  return prompt({
    type: 'confirm',
    message: 'Have you solved the merge conflict?'
  });
}

module.exports = {
  confirmConflictResolved,
  listCommits,
  listFullRepoName,
  listVersions,
  checkboxVersions
};
