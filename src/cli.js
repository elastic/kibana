const inquirer = require('inquirer');
const ora = require('ora');
const path = require('path');
const prompts = require('./prompts');
const { withSpinner } = require('./utils');
const github = require('./github');
const constants = require('./constants');
const { getConfigFilePath, getRepoPath } = require('./env');
const { ensureConfigAndFoldersExists, validateConfig } = require('./configs');

const {
  resetAndPullMaster,
  cherrypick,
  createAndCheckoutBranch,
  maybeSetupRepo,
  push
} = require('./git');

const getFullRepoNames = repositories => repositories.map(repo => repo.name);
const getVersions = (repositories, fullRepoName) => {
  return repositories.find(repo => repo.name === fullRepoName).versions;
};

function isCherrypickConflict(e) {
  return e.cmd.includes('git cherry-pick');
}

function getReference(owner, repoName, commitSha) {
  return github
    .getPullRequestByCommit(owner, repoName, commitSha)
    .then(pullRequest => {
      if (pullRequest) {
        return { type: 'pullRequest', value: pullRequest };
      }

      return { type: 'commit', value: commitSha.slice(0, 7) };
    });
}

function cherrypickAndPrompt(owner, repoName, sha) {
  return withSpinner(
    cherrypick(owner, repoName, sha),
    'Cherry-pick commit',
    `Cherry-pick commit failed. Please resolve conflicts in: ${getRepoPath(
      owner,
      repoName
    )}`
  ).catch(e => {
    if (!isCherrypickConflict(e)) {
      throw e;
    }

    return inquirer
      .prompt([prompts.confirmConflictResolved()])
      .then(({ isConflictResolved }) => {
        if (!isConflictResolved) {
          const error = new Error(constants.CHERRYPICK_CONFLICT_NOT_HANDLED);
          error.details = e.message;
          throw error;
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

function getCurrentRepoName(fullRepoNames, cwd) {
  const currentDir = path.basename(cwd);
  return fullRepoNames.find(name => name.endsWith(`/${currentDir}`));
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

function doBackportVersion(
  owner,
  repoName,
  commit,
  reference,
  version,
  username
) {
  const backportBranchName = getBackportBranchName(version, reference);

  return withSpinner(resetAndPullMaster(owner, repoName), 'Pull latest changes')
    .then(() =>
      createAndCheckoutBranch(owner, repoName, version, backportBranchName)
    )
    .then(() => cherrypickAndPrompt(owner, repoName, commit.sha))
    .then(() =>
      withSpinner(
        push(owner, repoName, username, backportBranchName),
        'Pushing branch'
      )
    )
    .then(() => {
      const payload = getPullRequestPayload(
        commit.message,
        version,
        reference,
        username
      );
      return withSpinner(
        github.createPullRequest(owner, repoName, payload),
        'Creating pull request'
      );
    });
}

function init(config, options) {
  const { username, accessToken, repositories } = config;
  return ensureConfigAndFoldersExists()
    .then(() => validateConfig(config))
    .then(() => github.setAccessToken(accessToken))
    .then(() => {
      const fullRepoNames = getFullRepoNames(repositories);
      const currentRepoName = getCurrentRepoName(fullRepoNames, options.cwd);
      if (currentRepoName) {
        console.log(`Repository: ${currentRepoName}`);
        return currentRepoName;
      }

      return inquirer
        .prompt([prompts.listFullRepositoryName(fullRepoNames)])
        .then(({ fullRepoName }) => fullRepoName);
    })
    .then(fullRepoName => {
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
          commit,
          version
        }));
    })
    .then(({ owner, repoName, commit, version }) => {
      return getReference(owner, repoName, commit.sha).then(reference => {
        console.log(
          `Backporting ${getReferenceValue(reference)} to ${version}`
        );

        return withSpinner(
          maybeSetupRepo(owner, repoName, username),
          'Cloning repository (may take a few minutes)'
        ).then(() =>
          doBackportVersion(
            owner,
            repoName,
            commit,
            reference,
            version,
            username
          )
        );
      });
    })
    .then(res => console.log(`View pull request: ${res.data.html_url}`))
    .catch(e => {
      switch (e.message) {
        case constants.INVALID_CONFIG:
          console.log(
            `Welcome to the Backport CLI tool! Update this config to proceed: ${getConfigFilePath()}`
          );
          break;

        case constants.GITHUB_ERROR:
          console.error(JSON.stringify(e.details, null, 4));
          break;

        case constants.CHERRYPICK_CONFLICT_NOT_HANDLED:
          console.error('Merge conflict was not resolved', e.details);
          break;

        default:
          console.error(e);
      }
    });
}

module.exports = {
  init
};
