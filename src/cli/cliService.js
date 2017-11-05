const ora = require('ora');
const path = require('path');
const prompts = require('../lib/prompts');
const github = require('../lib/github');
const constants = require('../lib/constants');
const { getRepoPath } = require('../lib/env');

const {
  resetAndPullMaster,
  cherrypick,
  createAndCheckoutBranch,
  push,
  repoExists,
  setupRepo
} = require('../lib/git');

function doBackportVersions({
  owner,
  repoName,
  commit,
  reference,
  versions,
  username,
  labels
}) {
  return sequentially(versions, version => {
    return doBackportVersion({
      owner,
      repoName,
      commit,
      reference,
      version,
      username,
      labels
    })
      .then(res => console.log(`View pull request: ${res.data.html_url}\n`))
      .catch(handleErrors);
  });
}

function doBackportVersion({
  owner,
  repoName,
  commit,
  reference,
  version,
  username,
  labels = []
}) {
  const backportBranchName = getBackportBranchName(version, reference);
  console.log(`Backporting ${getReferenceLong(reference)} to ${version}`);

  return withSpinner(
    resetAndPullMaster(owner, repoName).then(() =>
      createAndCheckoutBranch(owner, repoName, version, backportBranchName)
    ),
    'Pulling latest changes'
  )
    .then(() => cherrypickAndPrompt(owner, repoName, commit.sha))
    .then(() =>
      withSpinner(
        push(owner, repoName, username, backportBranchName),
        `Pushing branch ${username}:${backportBranchName}`
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
        github.createPullRequest(owner, repoName, payload).then(res => {
          if (labels.length > 0) {
            return github
              .addLabels(owner, repoName, res.data.number, labels)
              .then(() => res);
          }
          return res;
        }),
        'Creating pull request'
      );
    });
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

function promptRepoInfo(repositories, cwd) {
  return Promise.resolve()
    .then(() => {
      const fullRepoNames = repositories.map(repo => repo.name);
      const currentFullRepoName = getCurrentFullRepoName(fullRepoNames, cwd);
      if (currentFullRepoName) {
        console.log(`Repository: ${currentFullRepoName}`);
        return currentFullRepoName;
      }
      return prompts.listFullRepoName(fullRepoNames);
    })
    .then(fullRepoName => {
      const [owner, repoName] = fullRepoName.split('/');
      return { owner, repoName };
    });
}

function maybeSetupRepo(owner, repoName, username) {
  return repoExists(owner, repoName).then(exists => {
    if (!exists) {
      return withSpinner(
        setupRepo(owner, repoName, username),
        'Cloning repository (may take a few minutes the first time)'
      );
    }
  });
}

function promptCommit(owner, repoName, username) {
  const spinner = ora('Loading commits...').start();
  return github
    .getCommits(owner, repoName, username)
    .catch(e => {
      spinner.fail();
      throw e;
    })
    .then(commits => {
      spinner.stop();
      return prompts.listCommits(commits);
    });
}

function promptVersions(versions, multipleChoice = false) {
  return multipleChoice
    ? prompts.checkboxVersions(versions)
    : prompts.listVersions(versions);
}

function handleErrors(e) {
  switch (e.code) {
    case constants.INVALID_CONFIG:
      console.log(e.message);
      break;

    case constants.GITHUB_ERROR:
      console.error(JSON.stringify(e.details, null, 4));
      break;

    case constants.CHERRYPICK_CONFLICT_NOT_HANDLED:
      console.error('Merge conflict was not resolved', e.message);
      break;

    default:
      console.log(e.message);
      console.error(e);
  }
}

function sequentially(items, handler) {
  return items.reduce(
    (p, item) => p.then(() => handler(item)),
    Promise.resolve()
  );
}

function getReferenceValue({ type, value }, { short }) {
  if (type === 'pullRequest') {
    return short ? `pr-${value}` : `pull request #${value}`;
  }

  return short ? `commit-${value}` : `commit ${value}`;
}

function getReferenceLong(reference) {
  return getReferenceValue(reference, { short: false });
}

function getReferenceShort(reference) {
  return getReferenceValue(reference, { short: true });
}

function isCherrypickConflict(e) {
  return e.cmd.includes('git cherry-pick');
}

function cherrypickAndPrompt(owner, repoName, sha) {
  return withSpinner(
    cherrypick(owner, repoName, sha),
    'Cherry-picking commit',
    `Cherry-picking failed. Please resolve conflicts in: ${getRepoPath(
      owner,
      repoName
    )}`
  ).catch(e => {
    if (!isCherrypickConflict(e)) {
      throw e;
    }

    return prompts.confirmConflictResolved().then(isConflictResolved => {
      if (!isConflictResolved) {
        e.code = constants.CHERRYPICK_CONFLICT_NOT_HANDLED;
        throw e;
      }
    });
  });
}

function getBackportBranchName(version, reference) {
  const refValue = getReferenceShort(reference);
  return `backport/${version}/${refValue}`;
}

function getCurrentFullRepoName(fullRepoNames, cwd) {
  const currentDir = path.basename(cwd);
  return fullRepoNames.find(name => name.endsWith(`/${currentDir}`));
}

function getPullRequestPayload(commitMessage, version, reference, username) {
  const backportBranchName = getBackportBranchName(version, reference);
  const refValue = getReferenceLong(reference);

  return {
    title: `[${version}] ${commitMessage}`,
    body: `Backports ${refValue} to ${version}`,
    head: `${username}:${backportBranchName}`,
    base: `${version}`
  };
}

function withSpinner(promise, text, errorText) {
  const spinner = ora(text).start();
  return promise
    .then(res => {
      spinner.succeed();
      return res;
    })
    .catch(e => {
      if (errorText) {
        spinner.text = errorText;
      }
      spinner.fail();
      throw e;
    });
}

module.exports = {
  doBackportVersions,
  handleErrors,
  doBackportVersion,
  getReference,
  promptRepoInfo,
  maybeSetupRepo,
  promptCommit,
  promptVersions
};
