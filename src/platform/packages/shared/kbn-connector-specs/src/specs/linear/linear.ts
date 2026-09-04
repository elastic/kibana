/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  CreateAttachmentInput,
  CreateCommentInput,
  CreateIssueInput,
  GetIssueInput,
  IssueFilterInput,
  LinearIssueResponse,
  ListCyclesInput,
  ListIssuesInput,
  ListProjectsInput,
  ListTeamCollectionInput,
  ListUsersInput,
  RelayPaginationInput,
  UpdateIssueInput,
} from './types';
import {
  CreateAttachmentInputSchema,
  CreateCommentInputSchema,
  CreateIssueInputSchema,
  GetIssueInputSchema,
  ListIssuesInputSchema,
  ListProjectsInputSchema,
  ListTeamCollectionInputSchema,
  ListTeamsInputSchema,
  ListUsersInputSchema,
  UpdateIssueInputSchema,
} from './types';

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_ORDER_BY = 'updatedAt';
const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_GRAPHQL_ERRORS = 5;

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

interface RelayConnection {
  nodes?: unknown;
  pageInfo?: unknown;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasNonEmptyStringId = (value: unknown): value is Record<string, unknown> =>
  isPlainRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0;

const boundedMessage = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? Array.from(trimmed).slice(0, MAX_ERROR_MESSAGE_LENGTH).join('') : undefined;
};

const graphQLErrorDetail = (errors: unknown[]): string =>
  errors
    .slice(0, MAX_GRAPHQL_ERRORS)
    .map((error) => {
      if (typeof error !== 'object' || error === null || Array.isArray(error)) {
        return 'Malformed GraphQL error';
      }
      const record = error as Record<string, unknown>;
      const extensions =
        typeof record.extensions === 'object' && record.extensions !== null
          ? (record.extensions as Record<string, unknown>)
          : undefined;
      const message = boundedMessage(record.message) ?? 'Unknown GraphQL error';
      const code = boundedMessage(extensions?.code);
      return code ? `[${code}]: ${message}` : message;
    })
    .join('; ');

const knownHttpErrorMessage = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  const direct = boundedMessage(record.message) ?? boundedMessage(record.error);
  if (direct) {
    return direct;
  }
  if (Array.isArray(record.errors)) {
    return graphQLErrorDetail(record.errors);
  }
  return undefined;
};

const formatHttpError = (action: string, error: unknown): Error => {
  const requestError = error as {
    response?: { status?: number; data?: unknown };
    message?: unknown;
  };
  const status = requestError.response?.status;
  const detail =
    knownHttpErrorMessage(requestError.response?.data) ??
    boundedMessage(requestError.message) ??
    'Request failed';
  return new Error(`Linear ${action} failed${status ? ` (status ${status})` : ''}: ${detail}`);
};

const getAuthorizationHeaders = (ctx: ActionContext): Record<string, string> => {
  const apiKey = ctx.secrets?.Authorization;
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Linear connector is missing the API key.');
  }
  // Linear personal API keys are the complete Authorization value. Do not add `Bearer`.
  return {
    Accept: 'application/json',
    Authorization: apiKey.trim(),
    'Content-Type': 'application/json',
  };
};

const graphqlRequest = async <T>(
  ctx: ActionContext,
  action: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> => {
  let response;
  try {
    response = await ctx.client.post(
      LINEAR_API_URL,
      { query, variables },
      { headers: getAuthorizationHeaders(ctx) }
    );
  } catch (error) {
    throw formatHttpError(action, error);
  }

  const body: unknown = response.data;
  if (!isPlainRecord(body)) {
    throw new Error(`Linear ${action} returned no GraphQL data`);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'errors')) {
    if (!Array.isArray(body.errors)) {
      throw new Error(`Linear ${action} returned invalid GraphQL errors`);
    }
    if (body.errors.length > 0) {
      throw new Error(`Linear ${action} GraphQL error ${graphQLErrorDetail(body.errors)}`);
    }
  }
  if (body.data === undefined || body.data === null) {
    throw new Error(`Linear ${action} returned no GraphQL data`);
  }
  if (!isPlainRecord(body.data)) {
    throw new Error(`Linear ${action} returned invalid GraphQL data`);
  }
  return body.data as T;
};

const paginationVariables = (input: RelayPaginationInput): Record<string, unknown> => ({
  first: input.first ?? DEFAULT_PAGE_SIZE,
  ...(input.after !== undefined ? { after: input.after } : {}),
  orderBy: input.orderBy ?? DEFAULT_ORDER_BY,
});

const normalizeConnection = <TNode extends Record<string, unknown> = Record<string, unknown>>(
  action: string,
  connection: unknown
): { nodes: TNode[]; pageInfo: Record<string, unknown> } => {
  if (
    !isPlainRecord(connection) ||
    !Array.isArray(connection.nodes) ||
    !connection.nodes.every(hasNonEmptyStringId) ||
    !isPlainRecord(connection.pageInfo)
  ) {
    throw new Error(`Linear ${action} returned an invalid Relay connection`);
  }
  const { endCursor, hasNextPage, hasPreviousPage, startCursor } = connection.pageInfo;
  if (
    typeof hasNextPage !== 'boolean' ||
    typeof hasPreviousPage !== 'boolean' ||
    (endCursor !== undefined && endCursor !== null && typeof endCursor !== 'string') ||
    (startCursor !== undefined && startCursor !== null && typeof startCursor !== 'string') ||
    (hasNextPage && (typeof endCursor !== 'string' || endCursor.trim().length === 0))
  ) {
    throw new Error(`Linear ${action} returned an invalid Relay connection`);
  }
  const pageInfo: Record<string, unknown> = {
    hasNextPage,
    hasPreviousPage,
    ...(typeof startCursor === 'string' ? { startCursor } : {}),
    ...(hasNextPage ? { endCursor } : {}),
  };
  return { nodes: connection.nodes as TNode[], pageInfo };
};

const requireTeamConnection = (
  action: string,
  teamId: string,
  team: unknown,
  connectionName: string
) => {
  if (team === undefined || team === null) {
    throw new Error(`Linear ${action} returned no team for id ${teamId}`);
  }
  if (!isPlainRecord(team)) {
    throw new Error(`Linear ${action} returned an invalid team for id ${teamId}`);
  }
  return normalizeConnection(action, team[connectionName]);
};

const issueFilterVariables = (filter: IssueFilterInput | undefined): Record<string, unknown> => {
  if (!filter) {
    return {};
  }
  const createdAt = {
    ...(filter.createdAfter ? { gte: filter.createdAfter } : {}),
    ...(filter.createdBefore ? { lte: filter.createdBefore } : {}),
  };
  const updatedAt = {
    ...(filter.updatedAfter ? { gte: filter.updatedAfter } : {}),
    ...(filter.updatedBefore ? { lte: filter.updatedBefore } : {}),
  };
  return {
    ...(filter.teamId ? { team: { id: { eq: filter.teamId } } } : {}),
    ...(filter.projectId ? { project: { id: { eq: filter.projectId } } } : {}),
    ...(filter.assigneeId ? { assignee: { id: { eq: filter.assigneeId } } } : {}),
    ...(filter.stateId ? { state: { id: { eq: filter.stateId } } } : {}),
    ...(filter.labelIds ? { labels: { id: { in: filter.labelIds } } } : {}),
    ...(filter.titleContains ? { title: { containsIgnoreCase: filter.titleContains } } : {}),
    ...(filter.priority !== undefined ? { priority: { eq: filter.priority } } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    ...(Object.keys(updatedAt).length > 0 ? { updatedAt } : {}),
  };
};

const createIssueVariables = (input: CreateIssueInput): Record<string, unknown> => ({
  teamId: input.teamId,
  title: input.title,
  ...(input.description !== undefined ? { description: input.description } : {}),
  ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
  ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
  ...(input.cycleId !== undefined ? { cycleId: input.cycleId } : {}),
  ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
  ...(input.stateId !== undefined ? { stateId: input.stateId } : {}),
  ...(input.priority !== undefined ? { priority: input.priority } : {}),
  ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
  ...(input.labelIds !== undefined ? { labelIds: input.labelIds } : {}),
});

const updateIssueVariables = (input: UpdateIssueInput): Record<string, unknown> => {
  const variables: Record<string, unknown> = {};
  for (const key of [
    'title',
    'description',
    'assigneeId',
    'projectId',
    'cycleId',
    'parentId',
    'stateId',
    'priority',
    'dueDate',
    'labelIds',
    'addedLabelIds',
    'removedLabelIds',
  ] as const) {
    if (input[key] !== undefined) {
      variables[key] = input[key];
    }
  }
  return variables;
};

const requireMutationEntity = <T>(action: string, payload: unknown, entityName: string): T => {
  if (!isPlainRecord(payload)) {
    throw new Error(`Linear ${action} returned an invalid mutation payload`);
  }
  if (payload.success !== true) {
    throw new Error(`Linear ${action} reported success=false`);
  }
  const entity = payload[entityName];
  if (!hasNonEmptyStringId(entity)) {
    throw new Error(`Linear ${action} succeeded but returned an invalid ${entityName}`);
  }
  return entity as T;
};

export const Linear: ConnectorSpec = {
  metadata: {
    id: '.linear',
    displayName: 'Linear',
    description: i18n.translate('core.kibanaConnectorSpecs.linear.metadata.description', {
      defaultMessage: 'Search and inspect Linear teams, projects, users, and issues.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        defaults: { headerField: 'Authorization' },
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.linear.auth.apiKey.label', {
            defaultMessage: 'Linear API key',
          }),
          meta: {
            Authorization: {
              label: i18n.translate('core.kibanaConnectorSpecs.linear.auth.apiKey.fieldLabel', {
                defaultMessage: 'API key',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.linear.auth.apiKey.helpText', {
                defaultMessage:
                  'Paste the raw personal API key from Linear settings. Do not add Bearer; Linear expects the key itself as the Authorization header value.',
              }),
            },
            headerField: { hidden: true },
          },
        },
      },
    ],
  },

  schema: lazySchema(() => z.object({})),

  skill: `Linear organizes product work into teams, projects, workflow states, labels, users, issues, comments, and attachments.

Availability:
- This initial connector rollout is available to Agent Builder only.
- Read actions marked as tools are available now. Mutation actions are reserved for a planned Workflows activation after the connector reaches all Production-NonCanary versions.

Discovery flow:
1. Call listTeams first and retain the team id.
2. Use listProjects, listCycles, listWorkflowStates, listIssueLabels, and listUsers to resolve human names to ids before creating or updating an issue.
3. Follow Relay pagination while pageInfo.hasNextPage is true, passing pageInfo.endCursor as after.

Issue flow:
- Use listIssues for bounded discovery and getIssue for one exact UUID or identifier such as ENG-42.
- createIssue requires teamId and title. Use ids returned by the discovery actions for projectId, stateId, assigneeId, and labelIds.
- updateIssue changes only supplied fields. Omitted fields stay unchanged; explicit null clears nullable values such as description, assigneeId, projectId, and dueDate.
- cycleId and parentId can be supplied when creating an issue, updated later, or explicitly cleared with null.
- labelIds replaces the complete label set. addedLabelIds and removedLabelIds make incremental changes; do not mix replacement with incremental label fields.
- Priority values are 0=no priority, 1=urgent, 2=high, 3=medium, and 4=low. dueDate is YYYY-MM-DD.
- createComment appends Markdown to an issue. createAttachment links an existing HTTPS URL; it does not upload file bytes. Linear treats the same issueId plus URL as the same attachment. An optional iconUrl should point to a PNG or JPG no larger than 1 MB; Linear recommends 20x20 pixels. The connector checks that iconUrl uses HTTPS but does not fetch or verify its format, size, or dimensions.`,

  actions: {
    listTeams: {
      isTool: true,
      scope: 'read',
      input: ListTeamsInputSchema,
      description: 'List Linear teams with bounded Relay pagination and stable ids.',
      handler: async (ctx, input: RelayPaginationInput) => {
        const data = await graphqlRequest<{ teams?: RelayConnection }>(
          ctx,
          'listTeams',
          QUERIES.listTeams,
          paginationVariables(input)
        );
        return normalizeConnection('listTeams', data.teams);
      },
    },

    listProjects: {
      isTool: true,
      scope: 'read',
      input: ListProjectsInputSchema,
      description: 'List projects across the workspace or within one team, with Relay pagination.',
      handler: async (ctx, input: ListProjectsInput) => {
        const pagination = paginationVariables(input);
        if (input.teamId) {
          const data = await graphqlRequest<{ team?: Record<string, unknown> | null }>(
            ctx,
            'listProjects',
            QUERIES.listTeamProjects,
            { teamId: input.teamId, ...pagination }
          );
          return requireTeamConnection('listProjects', input.teamId, data.team, 'projects');
        }
        const data = await graphqlRequest<{ projects?: RelayConnection }>(
          ctx,
          'listProjects',
          QUERIES.listProjects,
          pagination
        );
        return normalizeConnection('listProjects', data.projects);
      },
    },

    listCycles: {
      isTool: true,
      scope: 'read',
      input: ListTeamCollectionInputSchema,
      description: 'List cycles for one Linear team, including ids needed by issue actions.',
      handler: async (ctx, input: ListCyclesInput) => {
        const data = await graphqlRequest<{ team?: unknown }>(
          ctx,
          'listCycles',
          QUERIES.listCycles,
          { teamId: input.teamId, ...paginationVariables(input) }
        );
        return requireTeamConnection('listCycles', input.teamId, data.team, 'cycles');
      },
    },

    listWorkflowStates: {
      isTool: true,
      scope: 'read',
      input: ListTeamCollectionInputSchema,
      description:
        'List workflow states for one Linear team, including ids needed by issue actions.',
      handler: async (ctx, input: ListTeamCollectionInput) => {
        const data = await graphqlRequest<{ team?: Record<string, unknown> | null }>(
          ctx,
          'listWorkflowStates',
          QUERIES.listWorkflowStates,
          { teamId: input.teamId, ...paginationVariables(input) }
        );
        return requireTeamConnection('listWorkflowStates', input.teamId, data.team, 'states');
      },
    },

    listIssueLabels: {
      isTool: true,
      scope: 'read',
      input: ListTeamCollectionInputSchema,
      description: 'List issue labels for one Linear team, including ids needed by issue actions.',
      handler: async (ctx, input: ListTeamCollectionInput) => {
        const data = await graphqlRequest<{ team?: Record<string, unknown> | null }>(
          ctx,
          'listIssueLabels',
          QUERIES.listIssueLabels,
          { teamId: input.teamId, ...paginationVariables(input) }
        );
        return requireTeamConnection('listIssueLabels', input.teamId, data.team, 'labels');
      },
    },

    listUsers: {
      isTool: true,
      scope: 'read',
      input: ListUsersInputSchema,
      description:
        'List workspace users or members of one team, including ids needed for assignment.',
      handler: async (ctx, input: ListUsersInput) => {
        const variables = {
          ...paginationVariables(input),
          includeDisabled: input.includeDisabled ?? false,
        };
        if (input.teamId) {
          const data = await graphqlRequest<{ team?: Record<string, unknown> | null }>(
            ctx,
            'listUsers',
            QUERIES.listTeamMembers,
            { teamId: input.teamId, ...variables }
          );
          return requireTeamConnection('listUsers', input.teamId, data.team, 'members');
        }
        const data = await graphqlRequest<{ users?: RelayConnection }>(
          ctx,
          'listUsers',
          QUERIES.listUsers,
          variables
        );
        return normalizeConnection('listUsers', data.users);
      },
    },

    listIssues: {
      isTool: true,
      scope: 'read',
      input: ListIssuesInputSchema,
      description: 'List Linear issues using bounded typed filters and Relay pagination.',
      handler: async (ctx, input: ListIssuesInput) => {
        const archivedStatus = input.archivedStatus ?? 'active';
        const filter = {
          ...issueFilterVariables(input.filter),
          ...(archivedStatus === 'archived' ? { archivedAt: { null: false } } : {}),
        };
        const data = await graphqlRequest<{ issues?: RelayConnection }>(
          ctx,
          'listIssues',
          QUERIES.listIssues,
          {
            ...(Object.keys(filter).length > 0 ? { filter } : {}),
            ...paginationVariables(input),
            includeArchived: archivedStatus !== 'active',
          }
        );
        return normalizeConnection<LinearIssueResponse>('listIssues', data.issues);
      },
    },

    getIssue: {
      isTool: true,
      scope: 'read',
      input: GetIssueInputSchema,
      description: 'Get one Linear issue by UUID or human-readable identifier such as ENG-42.',
      handler: async (ctx, input: GetIssueInput) => {
        const data = await graphqlRequest<{ issue?: unknown | null }>(
          ctx,
          'getIssue',
          QUERIES.getIssue,
          { id: input.id }
        );
        if (data.issue === undefined || data.issue === null) {
          throw new Error(`Linear getIssue returned no issue for id ${input.id}`);
        }
        if (!hasNonEmptyStringId(data.issue)) {
          throw new Error(`Linear getIssue returned an invalid issue for id ${input.id}`);
        }
        return data.issue as LinearIssueResponse;
      },
    },

    createIssue: {
      isTool: false,
      scope: 'write',
      input: CreateIssueInputSchema,
      description:
        'Create a Linear issue. Requires a team id and non-empty title. Returns selected issue fields, including cycle and parent references.',
      handler: async (ctx, input: CreateIssueInput) => {
        const data = await graphqlRequest<{ issueCreate?: Record<string, unknown> | null }>(
          ctx,
          'createIssue',
          QUERIES.createIssue,
          { input: createIssueVariables(input) }
        );
        return requireMutationEntity<LinearIssueResponse>('createIssue', data.issueCreate, 'issue');
      },
    },

    updateIssue: {
      isTool: false,
      scope: 'destroy',
      input: UpdateIssueInputSchema,
      description:
        'Update only the supplied fields on one Linear issue, preserving omitted fields. Returns selected issue fields, including cycle and parent references.',
      handler: async (ctx, input: UpdateIssueInput) => {
        const data = await graphqlRequest<{ issueUpdate?: Record<string, unknown> | null }>(
          ctx,
          'updateIssue',
          QUERIES.updateIssue,
          { id: input.id, input: updateIssueVariables(input) }
        );
        return requireMutationEntity<LinearIssueResponse>('updateIssue', data.issueUpdate, 'issue');
      },
    },

    createComment: {
      isTool: false,
      scope: 'write',
      input: CreateCommentInputSchema,
      description:
        'Add a required Markdown comment body to one Linear issue. Returns selected comment fields.',
      handler: async (ctx, input: CreateCommentInput) => {
        const data = await graphqlRequest<{ commentCreate?: Record<string, unknown> | null }>(
          ctx,
          'createComment',
          QUERIES.createComment,
          { input: { issueId: input.issueId, body: input.body } }
        );
        return requireMutationEntity('createComment', data.commentCreate, 'comment');
      },
    },

    createAttachment: {
      isTool: false,
      scope: 'destroy',
      input: CreateAttachmentInputSchema,
      description:
        'Create or update a Linear issue attachment that links to an existing HTTPS URL. Returns selected attachment fields.',
      handler: async (ctx, input: CreateAttachmentInput) => {
        const attachmentInput = {
          issueId: input.issueId,
          title: input.title,
          url: input.url,
          ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
          ...(input.iconUrl !== undefined ? { iconUrl: input.iconUrl } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        };
        const data = await graphqlRequest<{
          attachmentCreate?: Record<string, unknown> | null;
        }>(ctx, 'createAttachment', QUERIES.createAttachment, { input: attachmentInput });
        return requireMutationEntity('createAttachment', data.attachmentCreate, 'attachment');
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.linear.test.description', {
      defaultMessage: 'Verify the API key by reading the current Linear user',
    }),
    handler: async (ctx) => {
      const data = await graphqlRequest<{
        viewer?: unknown;
      }>(ctx, 'test', QUERIES.viewer, {});
      if (!hasNonEmptyStringId(data.viewer)) {
        throw new Error('Linear test returned an invalid viewer');
      }
      const name = boundedMessage(data.viewer.displayName) ?? boundedMessage(data.viewer.name);
      return { message: name ? `Connected to Linear as ${name}.` : 'Connected to Linear.' };
    },
  },
};
