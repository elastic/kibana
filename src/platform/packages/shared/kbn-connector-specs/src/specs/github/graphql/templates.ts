/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod';
import type { GitHubQueryTemplate } from './types';

export const GITHUB_QUERY_TEMPLATES: GitHubQueryTemplate[] = [
  {
    id: 'orgCatalog.repos',
    variablesSchema: z.object({ org: z.string().min(1) }),
    isPaginated: true,
    description: 'List repositories for a GitHub organization with cursor pagination.',
    resultPath: 'organization.repositories',
    document: `
      query OrgCatalogRepos($org: String!, $first: Int!, $after: String) {
        organization(login: $org) {
          repositories(first: $first, after: $after, orderBy: { field: PUSHED_AT, direction: DESC }) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              databaseId
              name
              nameWithOwner
              description
              url
              isPrivate
              isArchived
              isFork
              forkCount
              stargazerCount
              diskUsage
              visibility
              primaryLanguage {
                name
              }
              repositoryTopics(first: 20) {
                nodes {
                  topic {
                    name
                  }
                }
              }
              defaultBranchRef {
                name
              }
              createdAt
              pushedAt
              updatedAt
              issues(states: OPEN) {
                totalCount
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'orgCatalog.teams',
    variablesSchema: z.object({ org: z.string().min(1) }),
    isPaginated: true,
    description: 'List teams for a GitHub organization with cursor pagination.',
    resultPath: 'organization.teams',
    document: `
      query OrgCatalogTeams($org: String!, $first: Int!, $after: String) {
        organization(login: $org) {
          teams(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              databaseId
              slug
              name
              description
              privacy
              combinedSlug
              parentTeam {
                slug
              }
              members {
                totalCount
              }
              repositories {
                totalCount
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'orgCatalog.teamMembers',
    variablesSchema: z.object({ org: z.string().min(1), teamSlug: z.string().min(1) }),
    isPaginated: true,
    description: 'List members of a GitHub organization team with cursor pagination.',
    resultPath: 'organization.team.members',
    document: `
      query OrgCatalogTeamMembers($org: String!, $teamSlug: String!, $first: Int!, $after: String) {
        organization(login: $org) {
          team(slug: $teamSlug) {
            members(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                login
                name
                avatarUrl
                company
                location
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'orgCatalog.members',
    variablesSchema: z.object({ org: z.string().min(1) }),
    isPaginated: true,
    description: 'List members of a GitHub organization with role information.',
    resultPath: 'organization.membersWithRole',
    document: `
      query OrgCatalogMembers($org: String!, $first: Int!, $after: String) {
        organization(login: $org) {
          membersWithRole(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              role
              node {
                id
                login
                name
                company
                location
                avatarUrl
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'orgCatalog.projects',
    variablesSchema: z.object({ org: z.string().min(1) }),
    isPaginated: true,
    description: 'List GitHub Projects v2 for an organization with cursor pagination.',
    resultPath: 'organization.projectsV2',
    document: `
      query OrgCatalogProjects($org: String!, $first: Int!, $after: String) {
        organization(login: $org) {
          projectsV2(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              number
              title
              url
              shortDescription
              public
              closed
              createdAt
              updatedAt
            }
          }
        }
      }
    `,
  },
  {
    id: 'orgCatalog.projectViews',
    variablesSchema: z.object({ org: z.string().min(1), projectNumber: z.number().int() }),
    isPaginated: true,
    description:
      'List saved views for a GitHub Project v2 by project node id. Pass projectId from orgCatalog.projects.',
    resultPath: 'node.views',
    document: `
      query OrgCatalogProjectViews($projectId: ID!, $first: Int!, $after: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            id
            number
            title
            views(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                number
                name
                filter
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'orgCatalog.projectItems',
    variablesSchema: z.object({ org: z.string().min(1), projectNumber: z.number().int() }),
    isPaginated: true,
    description:
      'List items for a GitHub Project v2 by project node id with cursor pagination. Pass projectId from orgCatalog.projects.',
    resultPath: 'node.items',
    document: `
      query OrgCatalogProjectItems($projectId: ID!, $first: Int!, $after: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                type
                createdAt
                updatedAt
                content {
                  __typename
                  ... on Issue {
                    id
                    number
                    title
                    url
                    state
                    repository {
                      name
                      nameWithOwner
                    }
                  }
                  ... on PullRequest {
                    id
                    number
                    title
                    url
                    state
                    repository {
                      name
                      nameWithOwner
                    }
                  }
                  ... on DraftIssue {
                    id
                    title
                    body
                  }
                }
                fieldValues(first: 50) {
                  nodes {
                    __typename
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      startDate
                      duration
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldMilestoneValue {
                      milestone {
                        title
                        dueOn
                      }
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldUserValue {
                      users(first: 10) {
                        nodes {
                          login
                          name
                        }
                      }
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldLabelValue {
                      labels(first: 10) {
                        nodes {
                          name
                        }
                      }
                      field {
                        ... on ProjectV2FieldCommon {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'activity.searchIssues',
    variablesSchema: z.object({ query: z.string().min(1) }),
    isPaginated: true,
    description:
      'Search issues org-wide. Pass a GitHub search query (e.g. "org:elastic updated:>2026-06-01 -is:pr").',
    resultPath: 'search',
    document: `
      query ActivitySearchIssues($query: String!, $first: Int!, $after: String) {
        search(type: ISSUE, query: $query, first: $first, after: $after) {
          issueCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ... on Issue {
              id
              number
              title
              state
              url
              createdAt
              updatedAt
              body
              author {
                login
              }
              repository {
                name
                nameWithOwner
                owner {
                  login
                }
              }
              labels(first: 20) {
                nodes {
                  name
                }
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'activity.searchPullRequests',
    variablesSchema: z.object({ query: z.string().min(1) }),
    isPaginated: true,
    description:
      'Search pull requests org-wide. Pass a GitHub search query (e.g. "org:elastic is:pr updated:>2026-06-01").',
    resultPath: 'search',
    document: `
      query ActivitySearchPullRequests($query: String!, $first: Int!, $after: String) {
        search(type: ISSUE, query: $query, first: $first, after: $after) {
          issueCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ... on PullRequest {
              id
              number
              title
              state
              url
              createdAt
              updatedAt
              mergedAt
              isDraft
              author {
                login
              }
              repository {
                name
                nameWithOwner
                owner {
                  login
                }
              }
              reviews(first: 10) {
                nodes {
                  id
                  state
                  submittedAt
                  author {
                    login
                  }
                }
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'graph.issueGraph',
    resultPath: 'repository.issue',
    variablesSchema: z.object({ owner: z.string().min(1), repo: z.string().min(1), number: z.number().int() }),
    isPaginated: false,
    description:
      'Fetch an issue with parent issue, sub-issues, and comments for linkage enrichment.',
    document: `
      query GraphIssue($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            id
            number
            title
            state
            url
            body
            createdAt
            updatedAt
            author {
              login
            }
            parent {
              id
              number
              title
              url
            }
            subIssues(first: 50) {
              nodes {
                id
                number
                title
                state
                url
              }
            }
            comments(first: 50) {
              nodes {
                id
                body
                createdAt
                author {
                  login
                }
              }
            }
            labels(first: 20) {
              nodes {
                name
              }
            }
          }
        }
      }
    `,
  },
  {
    id: 'graph.pullRequestGraph',
    resultPath: 'repository.pullRequest',
    variablesSchema: z.object({ owner: z.string().min(1), repo: z.string().min(1), number: z.number().int() }),
    isPaginated: false,
    description: 'Fetch a pull request with reviews, review threads, and linked closing issues.',
    document: `
      query GraphPullRequest($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            id
            number
            title
            state
            url
            body
            createdAt
            updatedAt
            mergedAt
            isDraft
            author {
              login
            }
            reviews(first: 30) {
              nodes {
                id
                state
                submittedAt
                body
                author {
                  login
                }
              }
            }
            reviewThreads(first: 30) {
              nodes {
                isResolved
                comments(first: 20) {
                  nodes {
                    id
                    body
                    createdAt
                    author {
                      login
                    }
                  }
                }
              }
            }
            closingIssuesReferences(first: 20) {
              nodes {
                id
                number
                title
                url
              }
            }
          }
        }
      }
    `,
  },
];

const templateMap = new Map(GITHUB_QUERY_TEMPLATES.map((template) => [template.id, template]));

export const getGitHubQueryTemplate = (templateId: string): GitHubQueryTemplate => {
  const template = templateMap.get(templateId);
  if (!template) {
    throw new Error(
      `Unknown GitHub GraphQL template "${templateId}". Use listQueryTemplates to see available templates.`
    );
  }
  return template;
};

export const listGitHubQueryTemplates = (): Array<{ id: string; description: string }> =>
  GITHUB_QUERY_TEMPLATES.map(({ id, description }) => ({ id, description }));
