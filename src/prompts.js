function listFullRepositoryName(repoNames) {
  return {
    type: 'list',
    name: 'fullRepoName',
    message: 'Select repository',
    choices: repoNames
  };
}

function listCommits(commits) {
  return {
    type: 'list',
    name: 'commit',
    message: 'Select commit to backport',
    choices: commits.map(commit => ({
      name: commit.message,
      value: commit,
      short: commit.message
    }))
  };
}

function listVersions(versions) {
  return {
    type: 'list',
    name: 'version',
    message: 'Select version to backport to',
    choices: versions
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
  confirmConflictResolved,
  listCommits,
  listFullRepositoryName,
  listVersions
};
