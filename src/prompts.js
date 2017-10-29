const inquirer = require('inquirer');

function listFullRepoName(repoNames) {
  return inquirer
    .prompt([
      {
        type: 'list',
        name: 'fullRepoName',
        message: 'Select repository',
        choices: repoNames
      }
    ])
    .then(({ fullRepoName }) => fullRepoName);
}

function listCommits(commits) {
  const pageSize = Math.min(10, commits.length);

  return inquirer
    .prompt([
      {
        pageSize,
        type: 'list',
        name: 'commit',
        message: 'Select commit to backport',
        choices: commits
          .map(commit => ({
            name: commit.message,
            value: commit,
            short: commit.message
          }))
          .concat(commits.length > pageSize ? new inquirer.Separator() : [])
      }
    ])
    .then(({ commit }) => commit);
}

function listVersions(versions) {
  return inquirer
    .prompt([
      {
        type: 'list',
        name: 'version',
        message: 'Select version to backport to',
        choices: versions
      }
    ])
    .then(({ version }) => [version]);
}

function checkboxVersions(versions) {
  return inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'versions',
        message: 'Select version to backport to',
        choices: versions
      }
    ])
    .then(({ versions }) => versions);
}

function confirmConflictResolved() {
  return inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'isConflictResolved',
        message: 'Have you solved the merge conflict?'
      }
    ])
    .then(({ isConflictResolved }) => isConflictResolved);
}

module.exports = {
  confirmConflictResolved,
  listCommits,
  listFullRepoName,
  listVersions,
  checkboxVersions
};
