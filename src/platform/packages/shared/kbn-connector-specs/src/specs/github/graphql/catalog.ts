/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GitHubQueryTemplate } from './types';
import { orgCatalogReposTemplate } from './templates/org_catalog_repos';
import { orgCatalogTeamsTemplate } from './templates/org_catalog_teams';
import { orgCatalogTeamMembersTemplate } from './templates/org_catalog_team_members';
import { orgCatalogMembersTemplate } from './templates/org_catalog_members';
import { orgCatalogProjectsTemplate } from './templates/org_catalog_projects';
import { orgCatalogProjectViewsTemplate } from './templates/org_catalog_project_views';
import { orgCatalogProjectItemsTemplate } from './templates/org_catalog_project_items';
import { activitySearchIssuesTemplate } from './templates/activity_search_issues';
import { activitySearchPullRequestsTemplate } from './templates/activity_search_pull_requests';
import { graphIssueGraphTemplate } from './templates/graph_issue_graph';
import { graphPullRequestGraphTemplate } from './templates/graph_pull_request_graph';

export const GITHUB_QUERY_TEMPLATES: readonly GitHubQueryTemplate[] = [
  orgCatalogReposTemplate,
  orgCatalogTeamsTemplate,
  orgCatalogTeamMembersTemplate,
  orgCatalogMembersTemplate,
  orgCatalogProjectsTemplate,
  orgCatalogProjectViewsTemplate,
  orgCatalogProjectItemsTemplate,
  activitySearchIssuesTemplate,
  activitySearchPullRequestsTemplate,
  graphIssueGraphTemplate,
  graphPullRequestGraphTemplate,
];

const templateMap = new Map(GITHUB_QUERY_TEMPLATES.map((t) => [t.id, t]));
const validIds = GITHUB_QUERY_TEMPLATES.map((t) => t.id).join(', ');

export const getTemplate = (templateId: string): GitHubQueryTemplate => {
  const template = templateMap.get(templateId);
  if (!template) {
    throw new Error(
      `Unknown GitHub GraphQL template "${templateId}". Valid template IDs: ${validIds}`
    );
  }
  return template;
};

export const listTemplates = (): Array<{ id: string; description: string }> =>
  GITHUB_QUERY_TEMPLATES.map(({ id, description }) => ({ id, description }));
