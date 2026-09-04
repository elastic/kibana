/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Linear } from './linear';

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const REQUEST_CONFIG = {
  headers: {
    Accept: 'application/json',
    Authorization: 'lin_api_key',
    'Content-Type': 'application/json',
  },
};

const PAGE_INFO_FIELDS = `pageInfo {
      hasNextPage
      endCursor
      hasPreviousPage
      startCursor
    }`;

const QUERIES = {
  viewer: `query LinearViewer {
  viewer {
    id
    name
    displayName
    email
    active
  }
}`,
  listTeams: `query LinearListTeams($first: Int!, $after: String, $orderBy: PaginationOrderBy) {
  teams(first: $first, after: $after, orderBy: $orderBy) {
    nodes {
      id
      name
      key
      description
      color
      visibility
      createdAt
      updatedAt
      archivedAt
    }
    ${PAGE_INFO_FIELDS}
  }
}`,
  listProjects: `query LinearListProjects($first: Int!, $after: String, $orderBy: PaginationOrderBy) {
  projects(first: $first, after: $after, orderBy: $orderBy) {
    nodes {
      id
      name
      url
      description
      startDate
      targetDate
      progress
      priority
      createdAt
      updatedAt
      archivedAt
    }
    ${PAGE_INFO_FIELDS}
  }
}`,
  listTeamProjects: `query LinearListTeamProjects(
  $teamId: String!
  $first: Int!
  $after: String
  $orderBy: PaginationOrderBy
) {
  team(id: $teamId) {
    projects(first: $first, after: $after, orderBy: $orderBy) {
      nodes {
        id
        name
        url
        description
        startDate
        targetDate
        progress
        priority
        createdAt
        updatedAt
        archivedAt
      }
      ${PAGE_INFO_FIELDS}
    }
  }
}`,
  listCycles: `query LinearListCycles(
  $teamId: String!
  $first: Int!
  $after: String
  $orderBy: PaginationOrderBy
) {
  team(id: $teamId) {
    cycles(first: $first, after: $after, orderBy: $orderBy) {
      nodes {
        id
        number
        name
        description
        startsAt
        endsAt
        completedAt
        isActive
        isFuture
        isNext
        isPast
        isPrevious
        progress
        team {
          id
        }
        createdAt
        updatedAt
        archivedAt
      }
      ${PAGE_INFO_FIELDS}
    }
  }
}`,
  listWorkflowStates: `query LinearListWorkflowStates(
  $teamId: String!
  $first: Int!
  $after: String
  $orderBy: PaginationOrderBy
) {
  team(id: $teamId) {
    states(first: $first, after: $after, orderBy: $orderBy) {
      nodes {
        id
        name
        type
        color
        description
        position
        team {
          id
        }
        createdAt
        updatedAt
        archivedAt
      }
      ${PAGE_INFO_FIELDS}
    }
  }
}`,
  listIssueLabels: `query LinearListIssueLabels(
  $teamId: String!
  $first: Int!
  $after: String
  $orderBy: PaginationOrderBy
) {
  team(id: $teamId) {
    labels(first: $first, after: $after, orderBy: $orderBy) {
      nodes {
        id
        name
        color
        description
        isGroup
        team {
          id
        }
        createdAt
        updatedAt
        archivedAt
      }
      ${PAGE_INFO_FIELDS}
    }
  }
}`,
  listUsers: `query LinearListUsers(
  $first: Int!
  $after: String
  $includeDisabled: Boolean
  $orderBy: PaginationOrderBy
) {
  users(
    first: $first
    after: $after
    includeDisabled: $includeDisabled
    orderBy: $orderBy
  ) {
    nodes {
      id
      name
      displayName
      email
      active
      admin
      guest
      app
      avatarUrl
      url
      createdAt
      updatedAt
    }
    ${PAGE_INFO_FIELDS}
  }
}`,
  listTeamMembers: `query LinearListTeamMembers(
  $teamId: String!
  $first: Int!
  $after: String
  $includeDisabled: Boolean
  $orderBy: PaginationOrderBy
) {
  team(id: $teamId) {
    members(
      first: $first
      after: $after
      includeDisabled: $includeDisabled
      orderBy: $orderBy
    ) {
      nodes {
        id
        name
        displayName
        email
        active
        admin
        guest
        app
        avatarUrl
        url
        createdAt
        updatedAt
      }
      ${PAGE_INFO_FIELDS}
    }
  }
}`,
  listIssues: `query LinearListIssues(
  $filter: IssueFilter
  $first: Int!
  $after: String
  $includeArchived: Boolean
  $orderBy: PaginationOrderBy
) {
  issues(
    filter: $filter
    first: $first
    after: $after
    includeArchived: $includeArchived
    orderBy: $orderBy
  ) {
    nodes {
      id
      identifier
      title
      description
      priority
      priorityLabel
      dueDate
      url
      labelIds
      cycle {
        id
        name
        number
      }
      parent {
        id
        identifier
        title
      }
      team {
        id
      }
      state {
        id
      }
      project {
        id
      }
      assignee {
        id
      }
      createdAt
      updatedAt
      archivedAt
    }
    ${PAGE_INFO_FIELDS}
  }
}`,
  getIssue: `query LinearGetIssue($id: String!) {
  issue(id: $id) {
    id
    identifier
    title
    description
    priority
    priorityLabel
    dueDate
    url
    labelIds
    cycle {
      id
      name
      number
    }
    parent {
      id
      identifier
      title
    }
    team {
      id
    }
    state {
      id
    }
    project {
      id
    }
    assignee {
      id
    }
    createdAt
    updatedAt
    archivedAt
  }
}`,
  createIssue: `mutation LinearCreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      identifier
      title
      description
      priority
      priorityLabel
      dueDate
      url
      labelIds
      cycle {
        id
        name
        number
      }
      parent {
        id
        identifier
        title
      }
      team {
        id
      }
      state {
        id
      }
      project {
        id
      }
      assignee {
        id
      }
      createdAt
      updatedAt
      archivedAt
    }
  }
}`,
  updateIssue: `mutation LinearUpdateIssue($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue {
      id
      identifier
      title
      description
      priority
      priorityLabel
      dueDate
      url
      labelIds
      cycle {
        id
        name
        number
      }
      parent {
        id
        identifier
        title
      }
      team {
        id
      }
      state {
        id
      }
      project {
        id
      }
      assignee {
        id
      }
      createdAt
      updatedAt
      archivedAt
    }
  }
}`,
  createComment: `mutation LinearCreateComment($input: CommentCreateInput!) {
  commentCreate(input: $input) {
    success
    comment {
      id
      body
      url
      issue {
        id
      }
      user {
        id
      }
      createdAt
      updatedAt
      editedAt
      archivedAt
    }
  }
}`,
  createAttachment: `mutation LinearCreateAttachment($input: AttachmentCreateInput!) {
  attachmentCreate(input: $input) {
    success
    attachment {
      id
      title
      subtitle
      url
      metadata
      issue {
        id
      }
      sourceType
      createdAt
      updatedAt
      archivedAt
    }
  }
}`,
};

describe('Linear', () => {
  const mockClient = { post: jest.fn() };
  const mockContext = {
    client: mockClient,
    config: {},
    log: { debug: jest.fn() },
    secrets: { authType: 'api_key_header', Authorization: 'lin_api_key' },
  } as unknown as ActionContext;

  const connection = {
    nodes: [{ id: 'node-1', name: 'Example' }],
    pageInfo: {
      hasNextPage: true,
      endCursor: 'next',
      hasPreviousPage: false,
      startCursor: 'start',
    },
  };

  const issueRelationships = {
    cycle: { id: 'cycle-1', name: 'Cycle 42', number: 42 },
    parent: { id: 'issue-parent', identifier: 'ENG-10', title: 'Parent issue' },
  };

  const getAction = (name: string) => {
    const action = Linear.actions[name];
    if (!action) {
      throw new Error(`Action ${name} is not defined on the spec`);
    }
    return action;
  };

  const expectRequest = (query: string, variables: Record<string, unknown>) => {
    expect(mockClient.post).toHaveBeenLastCalledWith(
      LINEAR_API_URL,
      { query, variables },
      REQUEST_CONFIG
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata and auth', () => {
    it('stages the new connector for Agent Builder before Workflows activation', () => {
      expect(Linear.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(Linear.metadata.minimumLicense).toBe('enterprise');
      expect(Linear.metadata.description).toBe(
        'Search and inspect Linear teams, projects, users, and issues.'
      );
      expect(Linear.skill).toContain('listTeams');
      expect(Linear.skill).toContain('listCycles');
      expect(Linear.skill).toContain('labelIds');
      expect(Linear.skill).toContain('planned Workflows activation');
    });

    it('fixes and hides the raw Authorization header name', () => {
      const authType = Linear.auth?.types[0];
      expect(authType).not.toEqual('api_key_header');
      if (!authType || typeof authType === 'string') {
        throw new Error('expected an api_key_header definition');
      }
      expect(authType.type).toBe('api_key_header');
      expect(authType.defaults).toEqual({ headerField: 'Authorization' });
      expect(authType.overrides?.meta?.headerField).toEqual({ hidden: true });
    });

    it('makes reads tools and all mutations workflow-only', () => {
      expect(
        Object.fromEntries(
          Object.entries(Linear.actions).map(([name, action]) => [
            name,
            { isTool: action.isTool, scope: action.scope },
          ])
        )
      ).toEqual({
        listTeams: { isTool: true, scope: 'read' },
        listProjects: { isTool: true, scope: 'read' },
        listCycles: { isTool: true, scope: 'read' },
        listWorkflowStates: { isTool: true, scope: 'read' },
        listIssueLabels: { isTool: true, scope: 'read' },
        listUsers: { isTool: true, scope: 'read' },
        listIssues: { isTool: true, scope: 'read' },
        getIssue: { isTool: true, scope: 'read' },
        createIssue: { isTool: false, scope: 'write' },
        updateIssue: { isTool: false, scope: 'destroy' },
        createComment: { isTool: false, scope: 'write' },
        createAttachment: { isTool: false, scope: 'destroy' },
      });
    });
  });

  describe('Relay collection reads', () => {
    it('lists teams with exact query, variables, and pageInfo', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { teams: connection } } });

      const result = await getAction('listTeams').handler(mockContext, {
        first: 25,
        after: 'cursor-1',
        orderBy: 'createdAt',
      });

      expectRequest(QUERIES.listTeams, {
        first: 25,
        after: 'cursor-1',
        orderBy: 'createdAt',
      });
      expect(result).toEqual(connection);
    });

    it('omits endCursor when hasNextPage is false', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            teams: {
              nodes: [{ id: 'team-1', name: 'Engineering' }],
              pageInfo: {
                hasNextPage: false,
                endCursor: 'must-not-leak-as-a-follow-up-cursor',
                hasPreviousPage: true,
                startCursor: 'start',
              },
            },
          },
        },
      });

      const result = (await getAction('listTeams').handler(mockContext, {})) as {
        nodes: unknown[];
        pageInfo: Record<string, unknown>;
      };

      expect(result).toEqual({
        nodes: [{ id: 'team-1', name: 'Engineering' }],
        pageInfo: { hasNextPage: false, hasPreviousPage: true, startCursor: 'start' },
      });
      expect(result.pageInfo).not.toHaveProperty('endCursor');
    });

    it('lists all projects when no team is supplied', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { projects: connection } } });

      const result = await getAction('listProjects').handler(mockContext, {});

      expectRequest(QUERIES.listProjects, { first: 50, orderBy: 'updatedAt' });
      expect(result).toEqual(connection);
    });

    it('uses team(id).projects rather than an invalid project team filter', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { team: { projects: connection } } },
      });

      const result = await getAction('listProjects').handler(mockContext, {
        teamId: 'team-1',
        first: 10,
      });

      expectRequest(QUERIES.listTeamProjects, {
        teamId: 'team-1',
        first: 10,
        orderBy: 'updatedAt',
      });
      expect(result).toEqual(connection);
    });

    it('uses team(id).cycles with bounded forward Relay pagination', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { team: { cycles: connection } } } });

      const result = await getAction('listCycles').handler(mockContext, {
        teamId: 'team-1',
        first: 10,
        after: 'cursor-2',
        orderBy: 'createdAt',
      });

      expectRequest(QUERIES.listCycles, {
        teamId: 'team-1',
        first: 10,
        after: 'cursor-2',
        orderBy: 'createdAt',
      });
      expect(result).toEqual(connection);
    });

    it('uses team(id).states for workflow states', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { team: { states: connection } } } });

      await getAction('listWorkflowStates').handler(mockContext, {
        teamId: 'team-1',
        after: 'cursor-2',
      });

      expectRequest(QUERIES.listWorkflowStates, {
        teamId: 'team-1',
        first: 50,
        after: 'cursor-2',
        orderBy: 'updatedAt',
      });
    });

    it('uses team(id).labels for issue labels', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { team: { labels: connection } } } });

      await getAction('listIssueLabels').handler(mockContext, { teamId: 'team-1' });

      expectRequest(QUERIES.listIssueLabels, {
        teamId: 'team-1',
        first: 50,
        orderBy: 'updatedAt',
      });
    });

    it('lists all users with disabled users explicitly excluded', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { users: connection } } });

      await getAction('listUsers').handler(mockContext, { includeDisabled: false });

      expectRequest(QUERIES.listUsers, {
        first: 50,
        orderBy: 'updatedAt',
        includeDisabled: false,
      });
    });

    it('uses team(id).members when listUsers receives a team', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { team: { members: connection } } } });

      await getAction('listUsers').handler(mockContext, {
        teamId: 'team-1',
        includeDisabled: true,
        first: 5,
      });

      expectRequest(QUERIES.listTeamMembers, {
        teamId: 'team-1',
        first: 5,
        orderBy: 'updatedAt',
        includeDisabled: true,
      });
    });

    it('builds a bounded typed IssueFilter without interpolating values into the query', async () => {
      const issues = {
        ...connection,
        nodes: [{ id: 'issue-1', identifier: 'ENG-42', ...issueRelationships }],
      };
      mockClient.post.mockResolvedValue({ data: { data: { issues } } });

      const result = await getAction('listIssues').handler(mockContext, {
        filter: {
          teamId: 'team-1',
          projectId: 'project-1',
          assigneeId: 'user-1',
          stateId: 'state-1',
          labelIds: ['label-1', 'label-2'],
          titleContains: 'auth failure',
          priority: 2,
          createdAfter: '2026-09-01T00:00:00Z',
          createdBefore: '2026-09-30T23:59:59Z',
          updatedAfter: '2026-09-02T00:00:00Z',
        },
        archivedStatus: 'archived',
        first: 20,
        after: 'cursor-3',
        orderBy: 'createdAt',
      });

      expectRequest(QUERIES.listIssues, {
        filter: {
          team: { id: { eq: 'team-1' } },
          project: { id: { eq: 'project-1' } },
          assignee: { id: { eq: 'user-1' } },
          state: { id: { eq: 'state-1' } },
          labels: { id: { in: ['label-1', 'label-2'] } },
          title: { containsIgnoreCase: 'auth failure' },
          priority: { eq: 2 },
          createdAt: {
            gte: '2026-09-01T00:00:00Z',
            lte: '2026-09-30T23:59:59Z',
          },
          updatedAt: { gte: '2026-09-02T00:00:00Z' },
          archivedAt: { null: false },
        },
        first: 20,
        after: 'cursor-3',
        includeArchived: true,
        orderBy: 'createdAt',
      });
      expect(mockClient.post.mock.calls[0][1].query).not.toContain('auth failure');
      expect(result).toEqual(issues);
    });

    it('fails clearly when a requested team does not exist', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { team: null } } });

      await expect(
        getAction('listProjects').handler(mockContext, { teamId: 'missing-team' })
      ).rejects.toThrow('Linear listProjects returned no team for id missing-team');
    });

    it.each([
      ['an array pageInfo', { nodes: [{ id: 'team-1' }], pageInfo: [] }],
      [
        'a missing hasNextPage boolean',
        { nodes: [{ id: 'team-1' }], pageInfo: { hasPreviousPage: false } },
      ],
      [
        'a non-boolean hasPreviousPage',
        {
          nodes: [{ id: 'team-1' }],
          pageInfo: { hasNextPage: false, hasPreviousPage: 'false' },
        },
      ],
      [
        'a next page without a usable endCursor',
        {
          nodes: [{ id: 'team-1' }],
          pageInfo: { hasNextPage: true, hasPreviousPage: false, endCursor: '   ' },
        },
      ],
      [
        'a primitive node',
        { nodes: ['team-1'], pageInfo: { hasNextPage: false, hasPreviousPage: false } },
      ],
      [
        'a node without an id',
        { nodes: [{}], pageInfo: { hasNextPage: false, hasPreviousPage: false } },
      ],
      [
        'a node with an empty id',
        { nodes: [{ id: '' }], pageInfo: { hasNextPage: false, hasPreviousPage: false } },
      ],
    ])('rejects a Relay connection with %s', async (_description, invalidConnection) => {
      mockClient.post.mockResolvedValue({ data: { data: { teams: invalidConnection } } });

      await expect(getAction('listTeams').handler(mockContext, {})).rejects.toThrow(
        'Linear listTeams returned an invalid Relay connection'
      );
    });
  });

  describe('issue reads', () => {
    it('gets one issue by id or human-readable identifier', async () => {
      const issue = {
        id: 'issue-1',
        identifier: 'ENG-42',
        title: 'Investigate',
        ...issueRelationships,
      };
      mockClient.post.mockResolvedValue({ data: { data: { issue } } });

      const result = await getAction('getIssue').handler(mockContext, { id: 'ENG-42' });

      expectRequest(QUERIES.getIssue, { id: 'ENG-42' });
      expect(result).toEqual(issue);
    });

    it('throws when Linear returns no issue', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { issue: null } } });

      await expect(getAction('getIssue').handler(mockContext, { id: 'ENG-404' })).rejects.toThrow(
        'Linear getIssue returned no issue for id ENG-404'
      );
    });

    it.each([{}, 'issue', [], { id: '' }, { id: '   ' }])(
      'rejects an issue that is not a record with a non-empty id: %p',
      async (invalidIssue) => {
        mockClient.post.mockResolvedValue({ data: { data: { issue: invalidIssue } } });

        await expect(getAction('getIssue').handler(mockContext, { id: 'ENG-42' })).rejects.toThrow(
          'Linear getIssue returned an invalid issue for id ENG-42'
        );
      }
    );
  });

  describe('write actions', () => {
    it('creates an issue with title and teamId plus only supplied optional fields', async () => {
      const issue = {
        id: 'issue-1',
        identifier: 'ENG-42',
        title: 'Investigate',
        ...issueRelationships,
      };
      mockClient.post.mockResolvedValue({
        data: { data: { issueCreate: { success: true, issue } } },
      });

      const result = await getAction('createIssue').handler(mockContext, {
        teamId: 'team-1',
        title: 'Investigate',
        description: 'Details',
        priority: 1,
        dueDate: '2026-09-30',
        labelIds: ['label-1'],
        cycleId: 'cycle-1',
        parentId: 'ENG-10',
      });

      expectRequest(QUERIES.createIssue, {
        input: {
          teamId: 'team-1',
          title: 'Investigate',
          description: 'Details',
          priority: 1,
          dueDate: '2026-09-30',
          labelIds: ['label-1'],
          cycleId: 'cycle-1',
          parentId: 'ENG-10',
        },
      });
      expect(result).toEqual(issue);
    });

    it('updates only fields that are present and preserves explicit null and empty arrays', async () => {
      const issue = {
        id: 'issue-1',
        identifier: 'ENG-42',
        title: 'Investigate',
        cycle: null,
        parent: null,
      };
      mockClient.post.mockResolvedValue({
        data: { data: { issueUpdate: { success: true, issue } } },
      });

      const result = await getAction('updateIssue').handler(mockContext, {
        id: 'ENG-42',
        description: null,
        assigneeId: null,
        cycleId: null,
        parentId: null,
        dueDate: null,
        labelIds: [],
      });

      expectRequest(QUERIES.updateIssue, {
        id: 'ENG-42',
        input: {
          description: null,
          assigneeId: null,
          cycleId: null,
          parentId: null,
          dueDate: null,
          labelIds: [],
        },
      });
      expect(mockClient.post.mock.calls[0][1].variables.input).not.toHaveProperty('title');
      expect(result).toEqual(issue);
    });

    it('supports incremental label changes without sending labelIds replacement', async () => {
      const issue = { id: 'issue-1', identifier: 'ENG-42' };
      mockClient.post.mockResolvedValue({
        data: { data: { issueUpdate: { success: true, issue } } },
      });

      await getAction('updateIssue').handler(mockContext, {
        id: 'ENG-42',
        addedLabelIds: ['label-2'],
        removedLabelIds: ['label-1'],
      });

      expectRequest(QUERIES.updateIssue, {
        id: 'ENG-42',
        input: { addedLabelIds: ['label-2'], removedLabelIds: ['label-1'] },
      });
      expect(mockClient.post.mock.calls[0][1].variables.input).not.toHaveProperty('labelIds');
    });

    it('creates a comment with required issueId and body', async () => {
      const comment = { id: 'comment-1', body: 'Workaround applied' };
      mockClient.post.mockResolvedValue({
        data: { data: { commentCreate: { success: true, comment } } },
      });

      const result = await getAction('createComment').handler(mockContext, {
        issueId: 'ENG-42',
        body: 'Workaround applied',
      });

      expectRequest(QUERIES.createComment, {
        input: { issueId: 'ENG-42', body: 'Workaround applied' },
      });
      expect(result).toEqual(comment);
    });

    it('creates a URL attachment with bounded primitive metadata', async () => {
      const attachment = { id: 'attachment-1', title: 'Trace', url: 'https://example.com/trace' };
      mockClient.post.mockResolvedValue({
        data: { data: { attachmentCreate: { success: true, attachment } } },
      });

      const result = await getAction('createAttachment').handler(mockContext, {
        issueId: 'ENG-42',
        title: 'Trace',
        url: 'https://example.com/trace',
        subtitle: 'Production',
        metadata: { traceId: 'abc', score: 7 },
      });

      expectRequest(QUERIES.createAttachment, {
        input: {
          issueId: 'ENG-42',
          title: 'Trace',
          url: 'https://example.com/trace',
          subtitle: 'Production',
          metadata: { traceId: 'abc', score: 7 },
        },
      });
      expect(result).toEqual(attachment);
    });

    const mutationActions = [
      ['issueCreate', 'issue', 'createIssue', { teamId: 'team-1', title: 'x' }],
      ['issueUpdate', 'issue', 'updateIssue', { id: 'ENG-42', title: 'x' }],
      ['commentCreate', 'comment', 'createComment', { issueId: 'ENG-42', body: 'x' }],
      [
        'attachmentCreate',
        'attachment',
        'createAttachment',
        { issueId: 'ENG-42', title: 'x', url: 'https://example.com' },
      ],
    ] as const;

    it.each(mutationActions)(
      'requires success and an entity from %s',
      async (payloadName, entityName, actionName, input) => {
        mockClient.post.mockResolvedValue({
          data: {
            data: { [payloadName]: { success: false, [entityName]: null } },
          },
        });

        await expect(getAction(actionName).handler(mockContext, input)).rejects.toThrow(
          `Linear ${actionName} reported success=false`
        );
      }
    );

    it.each(mutationActions)(
      'rejects a malformed mutation payload from %s',
      async (payloadName, _entityName, actionName, input) => {
        mockClient.post.mockResolvedValue({ data: { data: { [payloadName]: 'invalid' } } });

        await expect(getAction(actionName).handler(mockContext, input)).rejects.toThrow(
          `Linear ${actionName} returned an invalid mutation payload`
        );
      }
    );

    it.each(mutationActions)(
      'requires a plain entity with a non-empty id from %s',
      async (payloadName, entityName, actionName, input) => {
        for (const invalidEntity of [
          undefined,
          null,
          {},
          'invalid',
          [],
          { id: '' },
          { id: '   ' },
        ]) {
          mockClient.post.mockResolvedValue({
            data: {
              data: {
                [payloadName]: {
                  success: true,
                  ...(invalidEntity === undefined ? {} : { [entityName]: invalidEntity }),
                },
              },
            },
          });

          await expect(getAction(actionName).handler(mockContext, input)).rejects.toThrow(
            `Linear ${actionName} succeeded but returned an invalid ${entityName}`
          );
        }
      }
    );
  });

  describe('GraphQL and authentication failures', () => {
    it('fails on top-level GraphQL errors even when HTTP status is 200', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: { teams: connection },
          errors: [
            { message: 'Authentication required', extensions: { code: 'AUTHENTICATION_ERROR' } },
            { message: 'Second failure' },
          ],
        },
      });

      await expect(getAction('listTeams').handler(mockContext, {})).rejects.toThrow(
        'Linear listTeams GraphQL error [AUTHENTICATION_ERROR]: Authentication required; Second failure'
      );
    });

    it.each([{}, 'invalid', null])(
      'rejects a non-array top-level GraphQL errors value: %p',
      async (errors) => {
        mockClient.post.mockResolvedValue({ data: { data: { teams: connection }, errors } });

        await expect(getAction('listTeams').handler(mockContext, {})).rejects.toThrow(
          'Linear listTeams returned invalid GraphQL errors'
        );
      }
    );

    it('accepts an explicitly empty GraphQL errors array', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { teams: connection }, errors: [] },
      });

      await expect(getAction('listTeams').handler(mockContext, {})).resolves.toEqual(connection);
    });

    it('handles malformed GraphQL error entries without leaking their raw values', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          errors: [null, 'do-not-surface-this-value', 42, { extensions: 'invalid' }],
        },
      });

      const result = getAction('listTeams').handler(mockContext, {});
      await expect(result).rejects.toThrow(
        'Linear listTeams GraphQL error Malformed GraphQL error; Malformed GraphQL error; Malformed GraphQL error; Unknown GraphQL error'
      );
      await expect(result).rejects.not.toThrow('do-not-surface-this-value');
    });

    it('truncates GraphQL error messages without splitting a Unicode code point', async () => {
      const boundedPrefix = 'a'.repeat(499);
      mockClient.post.mockResolvedValue({
        data: {
          errors: [{ message: `${boundedPrefix}\u{1F642}tail` }],
        },
      });

      await expect(getAction('listTeams').handler(mockContext, {})).rejects.toThrow(
        `Linear listTeams GraphQL error ${boundedPrefix}\u{1F642}`
      );
    });

    it('surfaces HTTP response details', async () => {
      mockClient.post.mockRejectedValue({
        response: { status: 429, data: { error: 'Rate limited' } },
      });

      await expect(getAction('listTeams').handler(mockContext, {})).rejects.toThrow(
        'Linear listTeams failed (status 429): Rate limited'
      );
    });

    it('rejects a missing API key before making a request', async () => {
      const noSecretContext = {
        ...mockContext,
        secrets: { authType: 'api_key_header' },
      } as unknown as ActionContext;

      await expect(getAction('listTeams').handler(noSecretContext, {})).rejects.toThrow(
        'Linear connector is missing the API key.'
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });

  describe('input bounds', () => {
    it('bounds Relay page size and issue priority', () => {
      expect(() => getAction('listTeams').input.parse({ first: 101 })).toThrow();
      expect(() => getAction('listCycles').input.parse({ teamId: 'team-1', first: 101 })).toThrow();
      expect(() => getAction('listCycles').input.parse({ first: 10 })).toThrow();
      expect(() =>
        getAction('createIssue').input.parse({ teamId: 'team-1', title: 'x', priority: 5 })
      ).toThrow();
    });

    it('requires title and teamId when creating an issue', () => {
      expect(() => getAction('createIssue').input.parse({ teamId: 'team-1' })).toThrow();
      expect(() => getAction('createIssue').input.parse({ title: 'x' })).toThrow();
    });

    it('requires at least one update without defaulting optional strings', () => {
      expect(() => getAction('updateIssue').input.parse({ id: 'ENG-42' })).toThrow();
      expect(getAction('updateIssue').input.parse({ id: 'ENG-42', title: 'New title' })).toEqual({
        id: 'ENG-42',
        title: 'New title',
      });
    });

    it('rejects team moves and unsafe identifier characters', () => {
      expect(() =>
        getAction('updateIssue').input.parse({ id: 'ENG-42', teamId: 'team-2' })
      ).toThrow('Provide at least one field to update');
      expect(() => getAction('getIssue').input.parse({ id: '../ENG-42' })).toThrow(
        'Must contain only letters, digits, hyphens, or underscores'
      );
    });

    it('accepts only YYYY-MM-DD timeless dates', () => {
      expect(() =>
        getAction('createIssue').input.parse({
          teamId: 'team-1',
          title: 'x',
          dueDate: '2026-09-30T10:00:00Z',
        })
      ).toThrow();
      expect(() =>
        getAction('createIssue').input.parse({
          teamId: 'team-1',
          title: 'x',
          dueDate: '2026-02-31',
        })
      ).toThrow();
    });

    it('forbids combining label replacement with incremental changes', () => {
      expect(() =>
        getAction('updateIssue').input.parse({
          id: 'ENG-42',
          labelIds: [],
          addedLabelIds: ['label-1'],
        })
      ).toThrow('labelIds replaces the complete set');
    });

    it('rejects nested attachment metadata', () => {
      expect(() =>
        getAction('createAttachment').input.parse({
          issueId: 'ENG-42',
          title: 'Trace',
          url: 'https://example.com',
          metadata: { nested: { unsafe: true } },
        })
      ).toThrow();
    });
  });

  describe('test connector', () => {
    it('queries viewer and sends the API key raw without a Bearer prefix', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { viewer: { id: 'user-1', name: 'Tin' } } },
      });

      const result = await Linear.test.handler(mockContext);

      expectRequest(QUERIES.viewer, {});
      expect(mockClient.post.mock.calls[0][2].headers.Authorization).toBe('lin_api_key');
      expect(result).toEqual({ message: 'Connected to Linear as Tin.' });
    });

    it.each([null, {}, 'viewer', [], { id: '' }, { id: '   ' }])(
      'rejects a viewer that is not a record with a non-empty id: %p',
      async (invalidViewer) => {
        mockClient.post.mockResolvedValue({ data: { data: { viewer: invalidViewer } } });

        await expect(Linear.test.handler(mockContext)).rejects.toThrow(
          'Linear test returned an invalid viewer'
        );
      }
    );
  });
});
