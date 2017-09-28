#!/usr/bin/env node

const inquirer = require('inquirer');
const ora = require('ora');
const prompts = require('./prompts');
const { withSpinner } = require('./utils');
const { getCommits, createPullRequest } = require('./github');
const constants = require('./constants');
const {
  getRepoPath,
  ensureConfigAndFoldersExists,
  username,
  validateConfig,
  CONFIG_FILE_PATH
} = require('./configs');

const {
  resetHard,
  openRepo,
  createAndCheckoutBranch,
  cherrypick,
  push,
  checkoutAndPull,
  getCommit,
  maybeSetupRepo
} = require('./git');

ensureConfigAndFoldersExists()
  .then(validateConfig)
  .then(() => {
    return inquirer.prompt([prompts.inputRepositoryName()]);
  })
  .then(({ repoName }) => {
    const spinner = ora('Loading commits...').start();
    return getCommits(repoName, username)
      .then(res =>
        res.data.map(commit => ({
          message: commit.commit.message,
          sha: commit.sha,
          date: commit.commit.author.date
        }))
      )
      .then(commits => {
        spinner.stop();
        return inquirer.prompt([
          prompts.listCommits(commits),
          prompts.listVersions()
        ]);
      })
      .then(function({ commit, version }) {
        const { sha, message } = commit;
        const [, pullRequest] = message.match(/\(#(\d+)\)$/) || {};
        const backportBranchName = `backport/${version}/${pullRequest}`;

        console.log(`Backporting #${pullRequest} to ${version}`);

        return withSpinner(
          maybeSetupRepo(repoName),
          'Cloning repository (may take a few minutes)'
        )
          .then(() => openRepo(repoName))
          .then(repo => {
            return resetHard(repo)
              .then(() =>
                withSpinner(
                  checkoutAndPull(repo, 'master'),
                  'Pull latest changes'
                )
              )
              .then(() => {
                return createAndCheckoutBranch(
                  repo,
                  version,
                  backportBranchName
                );
              })
              .then(() => {
                return withSpinner(
                  cherrypick(repo, sha),
                  'Cherry-pick commit',
                  `Cherry-pick commit failed. Please resolve conflicts in: ${getRepoPath(
                    repoName
                  )}`
                )
                  .catch(e => {
                    if (e.message !== constants.CHERRYPICK_CONFLICT) {
                      throw e;
                    }

                    return inquirer
                      .prompt([prompts.confirmConflictResolved()])
                      .then(({ isConflictResolved }) => {
                        if (!isConflictResolved) {
                          console.error(e);
                          throw new Error(
                            'Merge errors were not manually fixed'
                          );
                        }
                      });
                  })
                  .then(() =>
                    withSpinner(
                      push(repo, backportBranchName),
                      'Pushing branch'
                    )
                  )
                  .then(() => getCommit(repo, sha))
                  .then(commit => {
                    return withSpinner(
                      createPullRequest(repoName, {
                        title: `Backport: ${commit.message()}`,
                        body: `Backports #${pullRequest} to ${version}`,
                        head: `sqren:${backportBranchName}`,
                        base: `${version}`,
                        labels: [':apm', 'backport']
                      }),
                      'Creating pull request'
                    );
                  })
                  .then(res => {
                    console.log(`View pull request: ${res.data.html_url}`);
                  });
              });
          });
      });
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
