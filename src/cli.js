const inquirer = require('inquirer');
const ora = require('ora');
const { githubUsername } = require('../config.json');
const { getCommits, createPullRequest } = require('./github');
const {
  resetHard,
  openRepo,
  createAndCheckoutBranch,
  cherrypick,
  push,
  checkoutAndPull,
  getCommit
} = require('./git');

inquirer
  .prompt([
    {
      type: 'input',
      name: 'repoName',
      message: 'Repository',
      default: 'x-pack-kibana'
    }
  ])
  .then(({ repoName }) => {
    const spinner = ora('Loading commits...').start();
    return getCommits(repoName, githubUsername)
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
          {
            type: 'list',
            name: 'commit',
            message: 'Which pull request do you want to backport?',
            choices: commits.map(commits => ({
              name: commits.message,
              value: commits,
              short: commits.message
            }))
          },
          {
            type: 'list',
            name: 'version',
            message: 'Which version do you want to backport to?',
            choices: ['6.x', '6.0', '5.6', '5.5', '5.4'],
            default: 1
          }
        ]);
      })
      .then(function({ commit, version }) {
        const { sha, message } = commit;
        const [, pullRequest] = message.match(/\(#(\d+)\)$/) || {};
        const backportBranchName = `backport/${version}/${pullRequest}`;

        console.log(`Will backport #${pullRequest} to ${version}`);
        console.log(`Branchname: ${backportBranchName}`);
        console.log(`Sha: ${sha}`);

        return openRepo(repoName).then(repo => {
          return resetHard(repo)
            .then(() =>
              withSpinner(
                'Pull latest changes',
                checkoutAndPull(repo, 'master')
              )
            )
            .then(() => {
              return createAndCheckoutBranch(repo, version, backportBranchName);
            })
            .then(() => {
              return withSpinner(
                'Cherry-pick commit',
                cherrypick(repoName, sha)
              )
                .catch(e => {
                  return inquirer
                    .prompt([
                      {
                        type: 'confirm',
                        name: 'mergeResult',
                        message: 'Merge conflict resolved'
                      }
                    ])
                    .then(({ mergeResult }) => {
                      if (!mergeResult) {
                        console.error(e);
                        throw new Error('Merge errors were not manually fixed');
                      }
                    });
                })
                .then(() =>
                  withSpinner('Pushing branch', push(repo, backportBranchName))
                )
                .then(() => getCommit(repo, sha))
                .then(commit => {
                  return withSpinner(
                    'Creating pull request',
                    createPullRequest(repoName, {
                      title: `Backport: ${commit.message()}`,
                      body: `Backports #${pullRequest} to ${version}`,
                      head: `sqren:${backportBranchName}`,
                      base: `${version}`,
                      labels: [':apm', 'backport']
                    })
                  );
                })
                .then(res => {
                  console.log(`View pull request: ${res.data.html_url}`);
                });
            });
        });
      });
  })
  .catch(e => console.error(e));

function withSpinner(text, promise) {
  const spinner = ora(text).start();
  return promise
    .then(res => {
      spinner.succeed();
      return res;
    })
    .catch(e => {
      spinner.fail();
      throw e;
    });
}
