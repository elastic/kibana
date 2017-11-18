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
  })
    .then(commit => (multipleChoice ? commit.reverse() : [commit]))
    .then(
      selectedCommits =>
        selectedCommits.length === 0
          ? listCommits(commits, multipleChoice)
          : selectedCommits
    );
}

function listVersions(versions, multipleChoice) {
  return prompt({
    type: multipleChoice ? 'checkbox' : 'list',
    message: 'Select version to backport to',
    choices: versions
  })
    .then(version => (multipleChoice ? version : [version]))
    .then(
      selectedVersions =>
        selectedVersions.length === 0
          ? listCommits(versions, multipleChoice)
          : selectedVersions
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
  listFullRepoName,
  listVersions
};
