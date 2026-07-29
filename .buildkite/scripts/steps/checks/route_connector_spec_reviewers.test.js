/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  getReviewRequestPlan,
  routeConnectorSpecReviewers,
} = require('../../../../.github/scripts/route_connector_spec_reviewers');

const CONNECTOR_ROOT = 'src/platform/packages/shared/kbn-connector-specs/src/specs';
const registeredTeams = new Set(['elastic/workflows-eng', 'elastic/workchat-eng']);
const registry = JSON.stringify([
  { id: 'workflows', name: 'Workflows', github: { team: 'elastic/workflows-eng' } },
  { id: 'workchat', name: 'Workchat', github: { team: 'elastic/workchat-eng' } },
]);

const codeowners = (entries) =>
  entries.map(([pattern, owners]) => `${pattern} ${owners}`).join('\n');
const connectorPattern = (connector) => `${CONNECTOR_ROOT}/${connector}/**`;
const connectorFile = (connector) => `${CONNECTOR_ROOT}/${connector}/${connector}.ts`;

const getPlan = ({ changedFiles, baseEntries = [], headEntries }) =>
  getReviewRequestPlan({
    changedFiles,
    baseCodeowners: codeowners(baseEntries),
    headCodeowners: codeowners(headEntries),
    registeredTeams,
  });

const encodedFile = (contents) => ({
  type: 'file',
  encoding: 'base64',
  content: Buffer.from(contents).toString('base64'),
});

const createGithub = ({
  files,
  baseEntries = [],
  headEntries,
  requestedTeams = [],
  filePages,
}) => ({
  graphql: jest.fn(),
  rest: {
    repos: {
      getContent: jest.fn(({ path, ref }) => {
        if (path.endsWith('teams.jsonc')) return { data: encodedFile(registry) };
        if (path === '.github/CODEOWNERS') {
          return {
            data: encodedFile(codeowners(ref === 'base-sha' ? baseEntries : headEntries)),
          };
        }
        throw new Error(`Unexpected file ${path}`);
      }),
    },
    pulls: {
      listFiles: jest.fn(({ page }) => ({
        data: (filePages ?? [files.map((filename) => ({ filename }))])[page - 1] ?? [],
      })),
      listRequestedReviewers: jest.fn(() => ({
        data: { users: [{ login: 'existing-user' }], teams: requestedTeams },
      })),
    },
  },
});

const context = {
  repo: { owner: 'elastic', repo: 'kibana' },
  payload: {
    pull_request: {
      number: 1,
      node_id: 'PR_node',
      base: { sha: 'base-sha' },
      head: { sha: 'head-sha' },
    },
  },
};

const core = { info: jest.fn(), warning: jest.fn() };

describe('getReviewRequestPlan', () => {
  it('resolves a single-connector change to its owning team', () => {
    expect(
      getPlan({
        changedFiles: [connectorFile('test_workflows_connector')],
        headEntries: [[connectorPattern('test_workflows_connector'), '@elastic/workflows-eng']],
      }).teamSlugs
    ).toEqual(['workflows-eng']);
  });

  it('requests a mapping added in the head and nothing for an unchanged mapping', () => {
    const headEntries = [[connectorPattern('new_connector'), '@elastic/workchat-eng']];

    expect(
      getPlan({ changedFiles: [connectorFile('new_connector')], headEntries }).teamSlugs
    ).toEqual(['workchat-eng']);
    expect(
      getPlan({
        changedFiles: [connectorFile('new_connector')],
        baseEntries: headEntries,
        headEntries,
      }).teamSlugs
    ).toEqual([]);
  });

  it('requests the new team when an exact mapping changes', () => {
    expect(
      getPlan({
        changedFiles: [connectorFile('new_connector')],
        baseEntries: [[connectorPattern('new_connector'), '@elastic/workflows-eng']],
        headEntries: [[connectorPattern('new_connector'), '@elastic/workchat-eng']],
      }).teamSlugs
    ).toEqual(['workchat-eng']);
  });

  it('does not accept a broad specs rule as a connector declaration', () => {
    const plan = getPlan({
      changedFiles: [connectorFile('new_connector')],
      headEntries: [[`${CONNECTOR_ROOT}/**`, '@elastic/workflows-eng']],
    });

    expect(plan.teamSlugs).toEqual([]);
    expect(plan.messages).toEqual([
      'new_connector: no exact connector CODEOWNERS entry was found in the PR head',
    ]);
  });

  it.each([
    ['missing', []],
    ['malformed', [[connectorPattern('new_connector'), 'elastic/workflows-eng']]],
    ['non-Elastic', [[connectorPattern('new_connector'), '@someone']]],
    ['unregistered', [[connectorPattern('new_connector'), '@elastic/not-registered']]],
  ])('does not request a team for %s ownership', (_, headEntries) => {
    expect(
      getPlan({ changedFiles: [connectorFile('new_connector')], headEntries }).teamSlugs
    ).toEqual([]);
  });

  it('requests every registered team for multiple new connector directories', () => {
    expect(
      getPlan({
        changedFiles: [connectorFile('first_connector'), connectorFile('second_connector')],
        headEntries: [
          [connectorPattern('first_connector'), '@elastic/workflows-eng @elastic/workchat-eng'],
          [connectorPattern('second_connector'), '@elastic/workchat-eng'],
        ],
      }).teamSlugs
    ).toEqual(['workchat-eng', 'workflows-eng']);
  });
});

describe('routeConnectorSpecReviewers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds only a changed mapping team and preserves requested users and teams', async () => {
    const github = createGithub({
      files: [connectorFile('new_connector')],
      baseEntries: [[connectorPattern('new_connector'), '@elastic/workflows-eng']],
      headEntries: [[connectorPattern('new_connector'), '@elastic/workchat-eng']],
      requestedTeams: [{ slug: 'unrelated-team' }],
    });

    await routeConnectorSpecReviewers({ github, context, core });

    const [mutation, variables] = github.graphql.mock.calls[0];
    expect(mutation).toContain('requestReviewsByLogin');
    expect(mutation).not.toContain('userLogins');
    expect(variables).toEqual({ pullRequestId: 'PR_node', teamSlugs: ['workchat-eng'] });
    expect(github.rest.pulls.listRequestedReviewers).toHaveBeenCalledTimes(1);
  });

  it('does not request teams that are already requested', async () => {
    const github = createGithub({
      files: [connectorFile('new_connector')],
      headEntries: [[connectorPattern('new_connector'), '@elastic/workflows-eng']],
      requestedTeams: [{ slug: 'workflows-eng' }],
    });

    await routeConnectorSpecReviewers({ github, context, core });

    expect(github.graphql).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', []],
    ['malformed', [[connectorPattern('new_connector'), 'elastic/workflows-eng']]],
    ['non-Elastic', [[connectorPattern('new_connector'), '@someone']]],
    ['unregistered', [[connectorPattern('new_connector'), '@elastic/not-registered']]],
  ])('does not write reviewer requests for %s ownership', async (_, headEntries) => {
    const github = createGithub({
      files: [connectorFile('new_connector')],
      headEntries,
    });

    await routeConnectorSpecReviewers({ github, context, core });

    expect(github.graphql).not.toHaveBeenCalled();
  });

  it('paginates changed files before routing connector owners', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ filename: `docs/${index}.md` }));
    const github = createGithub({
      files: [],
      headEntries: [[connectorPattern('new_connector'), '@elastic/workflows-eng']],
      filePages: [firstPage, [{ filename: connectorFile('new_connector') }]],
    });

    await routeConnectorSpecReviewers({ github, context, core });

    expect(github.rest.pulls.listFiles).toHaveBeenCalledTimes(2);
    expect(github.graphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ teamSlugs: ['workflows-eng'] })
    );
  });
});
