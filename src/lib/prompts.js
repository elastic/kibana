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

function listCommits(commits, multipleChoice) {
  const pageSize = Math.min(10, commits.length);
  return prompt({
    pageSize,
    type: multipleChoice ? 'checkbox' : 'list',
    message: 'Select commit to backport',
    choices: commits
      .map(commit => ({
        name: commit.message,
        value: commit,
        short: commit.message
      }))
      .concat(commits.length > pageSize ? new inquirer.Separator() : [])
  }).then(commit => (multipleChoice ? commit.reverse() : [commit]));
}

function listVersions(versions, multipleChoice) {
  return prompt({
    type: multipleChoice ? 'checkbox' : 'list',
    message: 'Select version to backport to',
    choices: versions
  }).then(version => (multipleChoice ? version : [version]));
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
  listVersions
};
