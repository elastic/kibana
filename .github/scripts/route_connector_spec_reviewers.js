/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const CODEOWNERS_PATH = '.github/CODEOWNERS';
const TEAMS_PATH = 'src/platform/packages/private/kbn-code-owners/teams.jsonc';
const CONNECTOR_SPECS_ROOT = 'src/platform/packages/shared/kbn-connector-specs/src/specs';
const ELASTIC_TEAM_PREFIX = '@elastic/';

const getChangedConnectorDirectories = (files) => {
  const connectorDirectories = new Set();
  const connectorFilePattern = new RegExp(`^${CONNECTOR_SPECS_ROOT}/([^/]+)/`);

  for (const file of files) {
    const connectorDirectory = file.match(connectorFilePattern)?.[1];
    if (connectorDirectory) connectorDirectories.add(connectorDirectory);
  }

  return [...connectorDirectories].sort();
};

const parseCodeowners = (contents) => {
  const entries = [];

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine
      .slice(0, rawLine.indexOf('#') === -1 ? rawLine.length : rawLine.indexOf('#'))
      .trim();
    if (!line) continue;

    const [pattern, ...owners] = line.split(/\s+/);
    entries.push({
      pattern: pattern.replace(/\/$/, ''),
      owners,
      isMalformed: owners.length === 0 || owners.some((owner) => !owner.startsWith('@')),
    });
  }

  return entries;
};

const getExactConnectorEntry = (entries, connectorDirectory) => {
  const expectedPattern = `${CONNECTOR_SPECS_ROOT}/${connectorDirectory}/**`;

  for (let index = entries.length - 1; index >= 0; index--) {
    if (entries[index].pattern === expectedPattern) return entries[index];
  }

  return undefined;
};

const stripJsonComments = (contents) => {
  let result = '';
  let isInString = false;
  let isEscaped = false;

  for (let index = 0; index < contents.length; index++) {
    const character = contents[index];
    const nextCharacter = contents[index + 1];

    if (isInString) {
      result += character;
      if (isEscaped) {
        isEscaped = false;
      } else if (character === '\\') {
        isEscaped = true;
      } else if (character === '"') {
        isInString = false;
      }
      continue;
    }

    if (character === '"') {
      isInString = true;
      result += character;
    } else if (character === '/' && nextCharacter === '/') {
      while (index < contents.length && contents[index] !== '\n') index++;
      result += '\n';
    } else if (character === '/' && nextCharacter === '*') {
      index += 2;
      while (index < contents.length && !(contents[index] === '*' && contents[index + 1] === '/')) {
        index++;
      }
      index++;
    } else {
      result += character;
    }
  }

  return result;
};

const stripJsonTrailingCommas = (contents) => {
  let result = '';
  let isInString = false;
  let isEscaped = false;

  for (let index = 0; index < contents.length; index++) {
    const character = contents[index];

    if (isInString) {
      result += character;
      if (isEscaped) {
        isEscaped = false;
      } else if (character === '\\') {
        isEscaped = true;
      } else if (character === '"') {
        isInString = false;
      }
      continue;
    }

    if (character === '"') {
      isInString = true;
      result += character;
      continue;
    }

    if (character === ',') {
      let nextIndex = index + 1;
      while (/\s/.test(contents[nextIndex] ?? '')) nextIndex++;
      if (contents[nextIndex] === '}' || contents[nextIndex] === ']') continue;
    }

    result += character;
  }

  return result;
};

const getRegisteredTeams = (contents) => {
  const registry = JSON.parse(stripJsonTrailingCommas(stripJsonComments(contents)));
  if (!Array.isArray(registry)) throw new Error('The trusted teams registry must contain an array');

  return new Set(
    registry
      .map((team) => team?.github?.team)
      .filter((team) => typeof team === 'string' && team.startsWith('elastic/'))
  );
};

const ownersAreEqual = (firstOwners, secondOwners) => {
  if (firstOwners.length !== secondOwners.length) return false;

  const first = [...firstOwners].sort();
  const second = [...secondOwners].sort();
  return first.every((owner, index) => owner === second[index]);
};

const getReviewRequestPlan = ({
  changedFiles,
  baseCodeowners,
  headCodeowners,
  registeredTeams,
}) => {
  const baseEntries = parseCodeowners(baseCodeowners);
  const headEntries = parseCodeowners(headCodeowners);
  const teamSlugs = new Set();
  const messages = [];

  for (const connectorDirectory of getChangedConnectorDirectories(changedFiles)) {
    const headEntry = getExactConnectorEntry(headEntries, connectorDirectory);
    if (!headEntry) {
      messages.push(
        `${connectorDirectory}: no exact connector CODEOWNERS entry was found in the PR head`
      );
      continue;
    }

    if (headEntry.isMalformed) {
      messages.push(`${connectorDirectory}: the exact PR-head CODEOWNERS entry is malformed`);
      continue;
    }

    const elasticTeams = headEntry.owners
      .filter((owner) => owner.startsWith(ELASTIC_TEAM_PREFIX))
      .map((owner) => owner.slice(1));
    if (elasticTeams.length === 0) {
      messages.push(
        `${connectorDirectory}: the exact PR-head CODEOWNERS entry has no @elastic team`
      );
      continue;
    }

    const unregisteredTeams = elasticTeams.filter((team) => !registeredTeams.has(team));
    if (unregisteredTeams.length > 0) {
      messages.push(
        `${connectorDirectory}: the exact PR-head CODEOWNERS entry has an unregistered Elastic team`
      );
      continue;
    }

    const baseEntry = getExactConnectorEntry(baseEntries, connectorDirectory);
    if (baseEntry?.isMalformed) {
      messages.push(`${connectorDirectory}: the trusted base CODEOWNERS entry cannot be resolved`);
      continue;
    }

    if (baseEntry && ownersAreEqual(baseEntry.owners, headEntry.owners)) continue;

    for (const team of elasticTeams) teamSlugs.add(team.slice('elastic/'.length));
  }

  return { teamSlugs: [...teamSlugs].sort(), messages };
};

const getRequestedTeamSlugs = (teams) =>
  new Set(teams.map((team) => team.slug).filter((slug) => typeof slug === 'string'));

const listRequestedTeamSlugs = async ({ github, owner, repo, pullNumber }) => {
  const teams = [];

  for (let page = 1; ; page++) {
    const { data } = await github.rest.pulls.listRequestedReviewers({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });
    const requestedUsers = data.users ?? [];
    const requestedTeams = data.teams ?? [];
    teams.push(...requestedTeams);
    if (requestedUsers.length + requestedTeams.length < 100) return getRequestedTeamSlugs(teams);
  }
};

const getRepositoryFile = async ({ github, owner, repo, path, ref }) => {
  const { data } = await github.rest.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') {
    throw new Error(`Expected ${path} at ${ref} to be a file`);
  }

  return Buffer.from(data.content, data.encoding ?? 'base64').toString('utf8');
};

const listChangedFiles = async ({ github, owner, repo, pullNumber }) => {
  const files = [];

  for (let page = 1; ; page++) {
    const { data } = await github.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });
    files.push(...data.map((file) => file.filename));
    if (data.length < 100) return files;
  }
};

const requestTeamReviews = async ({ github, pullRequestId, teamSlugs }) => {
  await github.graphql(
    `mutation RequestReviewsByLogin(
      $pullRequestId: ID!
      $teamSlugs: [String!]
    ) {
      requestReviewsByLogin(
        input: {
          pullRequestId: $pullRequestId
          teamSlugs: $teamSlugs
          union: false
        }
      ) {
        clientMutationId
      }
    }`,
    { pullRequestId, teamSlugs }
  );
};

const routeConnectorSpecReviewers = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const pullRequest = context.payload.pull_request;
  const pullNumber = pullRequest.number;
  const changedFiles = await listChangedFiles({ github, owner, repo, pullNumber });

  if (getChangedConnectorDirectories(changedFiles).length === 0) {
    core.info('No connector spec directories changed');
    return;
  }

  let baseCodeowners;
  let headCodeowners;
  let teamsRegistry;
  try {
    [baseCodeowners, headCodeowners, teamsRegistry] = await Promise.all([
      getRepositoryFile({
        github,
        owner,
        repo,
        path: CODEOWNERS_PATH,
        ref: pullRequest.base.sha,
      }),
      getRepositoryFile({
        github,
        owner,
        repo,
        path: CODEOWNERS_PATH,
        ref: pullRequest.head.sha,
      }),
      getRepositoryFile({
        github,
        owner,
        repo,
        path: TEAMS_PATH,
        ref: pullRequest.base.sha,
      }),
    ]);
  } catch (error) {
    core.warning(`Could not load trusted ownership data: ${error.message}`);
    return;
  }

  let plan;
  try {
    plan = getReviewRequestPlan({
      changedFiles,
      baseCodeowners,
      headCodeowners,
      registeredTeams: getRegisteredTeams(teamsRegistry),
    });
  } catch (error) {
    core.warning(`Could not resolve connector ownership: ${error.message}`);
    return;
  }

  for (const message of plan.messages) core.warning(`Connector owner routing skipped, ${message}`);
  if (plan.teamSlugs.length === 0) {
    core.info('No connector spec team reviews need to be requested');
    return;
  }

  const requestedTeamSlugs = await listRequestedTeamSlugs({ github, owner, repo, pullNumber });
  const missingTeamSlugs = plan.teamSlugs.filter((teamSlug) => !requestedTeamSlugs.has(teamSlug));

  if (missingTeamSlugs.length === 0) {
    core.info('Connector spec team reviews are already requested');
    return;
  }

  await requestTeamReviews({
    github,
    pullRequestId: pullRequest.node_id,
    teamSlugs: missingTeamSlugs,
  });
  core.info(`Requested connector spec team reviews: ${missingTeamSlugs.join(', ')}`);
};

module.exports = {
  getChangedConnectorDirectories,
  getExactConnectorEntry,
  getRegisteredTeams,
  getRequestedTeamSlugs,
  getReviewRequestPlan,
  listChangedFiles,
  listRequestedTeamSlugs,
  parseCodeowners,
  routeConnectorSpecReviewers,
};
