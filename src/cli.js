const inquirer = require('inquirer');
const ora = require('ora');
const prompts = require('./prompts');
const { withSpinner } = require('./utils');
const github = require('./github');
const constants = require('./constants');
const { getConfigFilePath, getRepoPath } = require('./env');
const { ensureConfigAndFoldersExists, validateConfig } = require('./configs');

const {
  checkoutAndPull,
  cherrypick,
  createAndCheckoutBranch,
  getCommit,
  maybeSetupRepo,
  openRepo,
  push,
  resetHard
} = require('./git');

function cherrypickAndPrompt(repo, owner, repoName, sha) {
  return withSpinner(
    cherrypick(repo, sha),
    'Cherry-pick commit',
    `Cherry-pick commit failed. Please resolve conflicts in: ${getRepoPath(
      owner,
      repoName
    )}`
  ).catch(e => {
    if (e.message !== constants.CHERRYPICK_CONFLICT) {
      throw e;
    }

    return inquirer
      .prompt([prompts.confirmConflictResolved()])
      .then(({ isConflictResolved }) => {
        if (!isConflictResolved) {
          console.error(e);
          throw new Error('Merge errors were not manually fixed');
        }
      });
  });
}

function getBackportBranchName(version, reference) {
  const refValue = getReferenceValueShort(reference);
  return `backport/${version}/${refValue}`;
}

function getReferenceValueShort(reference) {
  return reference.type === 'pullRequest'
    ? `pr-${reference.value}`
    : `commit-${reference.value}`;
}

function getReferenceValue(reference) {
  return reference.type === 'pullRequest'
    ? `pull request #${reference.value}`
    : `commit ${reference.value}`;
}

function getPullRequestPayload(commitMessage, version, reference, username) {
  const backportBranchName = getBackportBranchName(version, reference);
  const refValue = getReferenceValue(reference);

  return {
    title: `[Backport] ${commitMessage}`,
    body: `Backports ${refValue} to ${version}`,
    head: `${username}:${backportBranchName}`,
    base: `${version}`
  };
}

const getFullRepoNames = repositories => repositories.map(repo => repo.name);
const getVersions = (repositories, fullRepoName) => {
  return repositories.find(repo => repo.name === fullRepoName).versions;
};

function init(config) {
  const { username, accessToken, repositories } = config;
  return ensureConfigAndFoldersExists()
    .then(() => validateConfig(config))
    .then(() => github.setAccessToken(accessToken))
    .then(() => {
      const fullRepoNames = getFullRepoNames(repositories);
      return inquirer.prompt([prompts.listFullRepositoryName(fullRepoNames)]);
    })
    .then(({ fullRepoName }) => {
      const [owner, repoName] = fullRepoName.split('/');
      const spinner = ora('Loading commits...').start();
      return github
        .getCommits(owner, repoName, username)
        .then(commits => {
          const versions = getVersions(repositories, fullRepoName);
          spinner.stop();
          return inquirer.prompt([
            prompts.listCommits(commits),
            prompts.listVersions(versions)
          ]);
        })
        .then(({ commit, version }) => ({
          owner,
          repoName,
          sha: commit.sha,
          reference: commit.reference,
          version
        }));
    })
    .then(({ owner, repoName, sha, reference, version }) => {
      console.log(`Backporting ${getReferenceValue(reference)} to ${version}`);

      return withSpinner(
        maybeSetupRepo(owner, repoName, username),
        'Cloning repository (may take a few minutes)'
      )
        .then(() => openRepo(owner, repoName))
        .then(repo => ({
          owner,
          repoName,
          sha,
          reference,
          version,
          repo
        }));
    })
    .then(({ owner, repoName, sha, reference, version, repo }) => {
      const backportBranchName = getBackportBranchName(version, reference);

      return resetHard(repo)
        .then(() =>
          withSpinner(checkoutAndPull(repo, 'master'), 'Pull latest changes')
        )
        .then(() => createAndCheckoutBranch(repo, version, backportBranchName))
        .then(() => cherrypickAndPrompt(repo, owner, repoName, sha))
        .then(() =>
          withSpinner(
            push(repo, backportBranchName, username),
            'Pushing branch'
          )
        )
        .then(() => getCommit(repo, sha))
        .then(commit =>
          withSpinner(
            github.createPullRequest(
              owner,
              repoName,
              getPullRequestPayload(
                commit.message(),
                version,
                reference,
                username
              )
            ),
            'Creating pull request'
          ).then(res => console.log(`View pull request: ${res.data.html_url}`))
        );
    })
    .catch(e => {
      if (e.message === constants.INVALID_CONFIG) {
        console.log(
          `Welcome to the Backport CLI tool! Update this config to proceed: ${getConfigFilePath()}`
        );
        return;
      }

      console.error(e);
    });
}

module.exports = {
  init
};
