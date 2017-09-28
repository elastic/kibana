function inputRepositoryName() {
  return {
    type: 'input',
    name: 'repoName',
    message: 'Repository',
    default: 'x-pack-kibana'
  };
}

function listCommits(commits) {
  return {
    type: 'list',
    name: 'commit',
    message: 'Which pull request do you want to backport?',
    choices: commits.map(commit => ({
      name: commit.message,
      value: commit,
      short: commit.message
    }))
  };
}

function listVersions() {
  return {
    type: 'list',
    name: 'version',
    message: 'Which version do you want to backport to?',
    choices: ['6.x', '6.0', '5.6', '5.5', '5.4']
  };
}

function confirmConflictResolved() {
  return {
    type: 'confirm',
    name: 'isConflictResolved',
    message: 'Have you solved the merge conflict?'
  };
}

module.exports = {
  inputRepositoryName,
  listCommits,
  listVersions,
  confirmConflictResolved
};
