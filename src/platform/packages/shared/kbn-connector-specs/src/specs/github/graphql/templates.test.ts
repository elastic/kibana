/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGitHubQueryTemplate, listGitHubQueryTemplates } from './templates';

describe('github graphql templates', () => {
  it('lists all ingest templates', () => {
    const templates = listGitHubQueryTemplates();
    expect(templates.map((template) => template.id)).toEqual(
      expect.arrayContaining([
        'orgCatalog.repos',
        'orgCatalog.teams',
        'orgCatalog.teamMembers',
        'orgCatalog.members',
        'orgCatalog.projects',
        'orgCatalog.projectViews',
        'orgCatalog.projectItems',
        'activity.searchIssues',
        'activity.searchPullRequests',
        'graph.issueGraph',
        'graph.pullRequestGraph',
      ])
    );
  });

  it('returns a template by id', () => {
    const template = getGitHubQueryTemplate('orgCatalog.repos');
    expect(template.resultPath).toBe('organization.repositories');
    expect(template.document).toContain('OrgCatalogRepos');
  });

  it('queries org member role on OrganizationMemberEdge, not User', () => {
    const template = getGitHubQueryTemplate('orgCatalog.members');
    expect(template.resultPath).toBe('organization.membersWithRole');
    expect(template.document).toContain('membersWithRole');
    expect(template.document).toMatch(/edges\s*\{[\s\S]*role[\s\S]*node\s*\{/);
    expect(template.document).not.toMatch(/nodes\s*\{[\s\S]*role/);
    expect(template.document).not.toMatch(/user\s*\{/);
  });

  it('loads project item field names for users, milestones, and iterations', () => {
    const template = getGitHubQueryTemplate('orgCatalog.projectItems');
    expect(template.document).toContain('fieldValues(first: 50)');
    expect(template.document).toContain('ProjectV2ItemFieldUserValue');
    expect(template.document).toContain('ProjectV2ItemFieldMilestoneValue');
    expect(template.document).toContain('ProjectV2ItemFieldIterationValue');
  });

  it('throws for unknown template ids', () => {
    expect(() => getGitHubQueryTemplate('unknown.template')).toThrow(
      'Unknown GitHub GraphQL template'
    );
  });
});
