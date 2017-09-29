#!/usr/bin/env node

const inquirer = require('inquirer');
const ora = require('ora');
const prompts = require('./prompts');
const { withSpinner } = require('./utils');
const { getCommits, createPullRequest } = require('./github');
const constants = require('./constants');
const {
  CONFIG_FILE_PATH,
  ensureConfigAndFoldersExists,
  getRepoPath,
  getConfig,
  validateConfig
} = require('./configs');

const { username } = getConfig();
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

function cherrypickAndPrompt(repo, repoName, sha) {
  return withSpinner(
    cherrypick(repo, sha),
    'Cherry-pick commit',
    `Cherry-pick commit failed. Please resolve conflicts in: ${getRepoPath(
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

function getBackportBranchName(version, pullRequest) {
  return `backport/${version}/${pullRequest}`;
}

function getPullRequestPayload(commitMessage, version, pullRequest) {
  const backportBranchName = getBackportBranchName(version, pullRequest);
  return {
    title: `Backport: ${commitMessage}`,
    body: `Backports #${pullRequest} to ${version}`,
    head: `${username}:${backportBranchName}`,
    base: `${version}`
  };
}

ensureConfigAndFoldersExists()
  .then(validateConfig)
  .then(() => inquirer.prompt([prompts.inputRepositoryName()]))
  .then(({ repoName }) => {
    const spinner = ora('Loading commits...').start();
    return getCommits(repoName, username)
      .then(commits => {
        spinner.stop();
        return inquirer.prompt([
          prompts.listCommits(commits),
          prompts.listVersions()
        ]);
      })
      .then(({ commit, version }) => ({
        repoName,
        sha: commit.sha,
        pullRequest: commit.pullRequest,
        version
      }));
  })
  .then(({ repoName, sha, pullRequest, version }) => {
    console.log(`Backporting #${pullRequest} to ${version}`);

    return withSpinner(
      maybeSetupRepo(repoName),
      'Cloning repository (may take a few minutes)'
    )
      .then(() => openRepo(repoName))
      .then(repo => ({
        repoName,
        sha,
        pullRequest,
        version,
        repo
      }));
  })
  .then(({ repoName, sha, pullRequest, version, repo }) => {
    const backportBranchName = getBackportBranchName(version, pullRequest);

    return resetHard(repo)
      .then(() =>
        withSpinner(checkoutAndPull(repo, 'master'), 'Pull latest changes')
      )
      .then(() => createAndCheckoutBranch(repo, version, backportBranchName))
      .then(() => cherrypickAndPrompt(repo, repoName, sha))
      .then(() => withSpinner(push(repo, backportBranchName), 'Pushing branch'))
      .then(() => getCommit(repo, sha))
      .then(commit =>
        withSpinner(
          createPullRequest(
            repoName,
            getPullRequestPayload(commit.message(), version, pullRequest)
          ),
          'Creating pull request'
        ).then(res => console.log(`View pull request: ${res.data.html_url}`))
      );
  })
  .catch(e => {
    if (e.message === constants.INVALID_CONFIG) {
      console.log(
        `Welcome to the Backport CLI tool! Update this config to proceed: ${CONFIG_FILE_PATH}`
      );
      return;
    }

    console.error(e);
  });
