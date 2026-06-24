/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface WorkflowExampleEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  /** Filename relative to the examples directory (e.g. "basic.yml") */
  filename: string;
}

/**
 * Catalog of bundled workflow examples. Metadata only -- YAML content is loaded
 * at runtime on the server via `loadWorkflowExampleContent()`.
 *
 * To add a new example: drop a .yml/.yaml file in this directory, then add an
 * entry here. Guard the `id` in `WORKFLOW_EXAMPLE_IDS` below.
 */
export const WORKFLOW_EXAMPLES: WorkflowExampleEntry[] = [
  {
    id: 'basic',
    name: 'JAMF Reminder',
    description: 'Scheduled workflow that reminds users to enroll in JAMF via Slack',
    category: 'integrations',
    tags: ['scheduled', 'http', 'foreach', 'slack', 'on-failure'],
    filename: 'basic.yml',
  },
  {
    id: 'nesting',
    name: 'Malicious Alert Handler (nesting)',
    description: 'Nested if/foreach for alert handling',
    category: 'security',
    tags: ['scheduled', 'if', 'foreach', 'nesting'],
    filename: 'example_nesting.yml',
  },
  {
    id: 'on_failure',
    name: 'Alert Handler with Fallback',
    description: 'AI completion with on-failure fallback to a different provider',
    category: 'security',
    tags: ['scheduled', 'ai', 'on-failure', 'structured-output'],
    filename: 'example_on_failure.yml',
  },
  {
    id: 'json_schema_inputs',
    name: 'Threat Intelligence with JSON Schema Inputs',
    description: 'Demonstrates JSON Schema inputs format with nested objects and validation',
    category: 'security',
    tags: ['manual', 'inputs', 'json-schema', 'console'],
    filename: 'example_security_workflow.yaml',
  },
  {
    id: 'legacy_inputs',
    name: 'Threat Intelligence (legacy inputs)',
    description: 'Same workflow using legacy array-based inputs format for backward compatibility',
    category: 'security',
    tags: ['manual', 'inputs', 'legacy', 'console'],
    filename: 'example_security_workflow_legacy.yaml',
  },
  {
    id: 'json_schema_ref',
    name: 'JSON Schema $ref Example',
    description: 'Demonstrates JSON Schema $ref for reusable input definitions',
    category: 'examples',
    tags: ['manual', 'inputs', 'json-schema', '$ref'],
    filename: 'example_test_workflow_with_ref.yaml',
  },
  {
    id: 'national_parks_demo',
    name: 'National Parks Demo',
    description:
      'Creates an Elasticsearch index, loads sample data with bulk operations, searches by category, and iterates results',
    category: 'examples',
    tags: ['manual', 'elasticsearch', 'if', 'foreach', 'bulk', 'console', 'consts'],
    filename: 'national_parks_demo.yml',
  },
  {
    id: 'traditional_triage',
    name: 'Traditional Triage',
    description:
      'Comprehensive malware alert response — VirusTotal scan, case creation, host isolation, ES|QL historical search, Slack notification',
    category: 'security',
    tags: ['alert', 'if', 'virustotal', 'kibana', 'cases', 'esql', 'http', 'slack', 'isolation'],
    filename: 'traditional_triage.yml',
  },
  {
    id: 'ip_reputation_check',
    name: 'IP Reputation Check',
    description:
      'Checks IP reputation via AbuseIPDB, enriches with geolocation, and formats a threat report using Liquid templating',
    category: 'security',
    tags: ['manual', 'http', 'on-failure', 'retry', 'console', 'liquid-if'],
    filename: 'ip_reputation_check.yml',
  },
  {
    id: 'summarize_hackernews',
    name: 'Summarize Hackernews',
    description:
      'Scrapes top Hacker News posts, formats them with AI (inference.completion), and posts to Slack on a daily schedule',
    category: 'utilities',
    tags: ['scheduled', 'rrule', 'http', 'inference', 'slack'],
    filename: 'summarize_hackernews.yml',
  },
  {
    id: 'esql_to_index',
    name: 'ES|QL Query Output to New Index',
    description:
      'Runs an ES|QL query to detect suspicious transactions, then indexes each result as a report document',
    category: 'search',
    tags: ['manual', 'esql', 'foreach', 'elasticsearch.index'],
    filename: 'esql_to_index.yml',
  },
  {
    id: 'mark_alert_closed',
    name: 'Mark Alert as Closed',
    description: 'Closes a security alert as false positive using kibana.SetAlertsStatus',
    category: 'security',
    tags: ['manual', 'kibana', 'alert-status'],
    filename: 'mark_alert_closed.yml',
  },
  {
    id: 'invoke_agent',
    name: 'Invoke an Agent',
    description: 'Triggers an AI agent to triage a security alert via the ai.agent step type',
    category: 'security',
    tags: ['alert', 'agent-builder', 'ai', 'console'],
    filename: 'invoke_agent.yml',
  },
  {
    id: 'sdlc_github_catalog_repos',
    name: 'SDLC GitHub catalog repos (GraphQL)',
    description:
      'Pages elastic org repositories via GitHub GraphQL, upserts github-intel-repos, and maintains github-intel-sync-state checkpoints',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_repos.yml',
  },
  {
    id: 'sdlc_github_catalog_teams',
    name: 'SDLC GitHub catalog teams (GraphQL)',
    description:
      'Pages organization teams via GitHub GraphQL, upserts github-intel-teams, and maintains github-intel-sync-state checkpoints',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'teams', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_teams.yml',
  },
  {
    id: 'sdlc_github_activity_issues',
    name: 'SDLC GitHub activity issues (GraphQL)',
    description:
      'Org-wide incremental issue search (updated since watermark), upserts github-intel-issues, and maintains sync checkpoints',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'issues', 'foreach', 'while'],
    filename: 'sdlc_github_activity_issues.yml',
  },
  {
    id: 'sdlc_github_activity_pull_requests',
    name: 'SDLC GitHub activity pull requests (GraphQL)',
    description:
      'Org-wide incremental PR search (updated since watermark), upserts github-intel-pull-requests, and maintains sync checkpoints',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'pull-requests', 'foreach', 'while'],
    filename: 'sdlc_github_activity_pull_requests.yml',
  },
  {
    id: 'sdlc_github_catalog_org_members',
    name: 'SDLC GitHub catalog org members (GraphQL)',
    description:
      'Pages organization members via GitHub GraphQL, upserts github-intel-people, and maintains sync checkpoints',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'people', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_org_members.yml',
  },
  {
    id: 'sdlc_github_catalog_team_members',
    name: 'SDLC GitHub catalog team members (GraphQL)',
    description:
      'Pages members per team from github-intel-teams, upserts people and team membership relationships',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'people', 'teams', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_team_members.yml',
  },
  {
    id: 'sdlc_github_catalog_projects',
    name: 'SDLC GitHub catalog projects (GraphQL)',
    description:
      'Pages organization GitHub Projects v2 via GraphQL, upserts github-intel-projects, and maintains sync checkpoints',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'projects', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_projects.yml',
  },
  {
    id: 'sdlc_github_enrich_issues_graph',
    name: 'SDLC GitHub enrich issues graph (GraphQL)',
    description:
      'Enriches github-intel-issues with parent/sub-issue/comment graph via graph.issueGraph template',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'issues', 'enrich', 'foreach'],
    filename: 'sdlc_github_enrich_issues_graph.yml',
  },
  {
    id: 'sdlc_github_enrich_pull_requests_graph',
    name: 'SDLC GitHub enrich pull requests graph (GraphQL)',
    description:
      'Enriches github-intel-pull-requests with reviews and closing issues via graph.pullRequestGraph',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'pull-requests', 'enrich', 'foreach'],
    filename: 'sdlc_github_enrich_pull_requests_graph.yml',
  },
  {
    id: 'sdlc_github_catalog_project_items',
    name: 'SDLC GitHub catalog project items (GraphQL)',
    description:
      'Pages GitHub Project v2 items per project from github-intel-projects into github-intel-project-items',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'projects', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_project_items.yml',
  },
  {
    id: 'sdlc_slack_catalog_users',
    name: 'SDLC Slack catalog users',
    description: 'Pages Slack workspace users via slack2.listUsers into slack-intel-people',
    category: 'security',
    tags: ['scheduled', 'slack', 'ingest', 'sdlc', 'people', 'foreach', 'while'],
    filename: 'sdlc_slack_catalog_users.yml',
  },
  {
    id: 'sdlc_slack_channel_history',
    name: 'SDLC Slack channel history',
    description:
      'Incremental Slack message ingest per channel via slack2.getChannelHistory into slack-intel-messages',
    category: 'security',
    tags: ['scheduled', 'slack', 'ingest', 'sdlc', 'messages', 'foreach', 'while'],
    filename: 'sdlc_slack_channel_history.yml',
  },
  {
    id: 'sdlc_github_normalize_project_items',
    name: 'SDLC GitHub normalize project items',
    description:
      'Parses Project v2 fieldValues into hierarchy, roadmap, and team_attribution on github-intel-project-items',
    category: 'security',
    tags: ['scheduled', 'github', 'ingest', 'sdlc', 'normalize', 'project', 'foreach'],
    filename: 'sdlc_github_normalize_project_items.yml',
  },
  {
    id: 'sdlc_github_build_team_dimension',
    name: 'SDLC GitHub build team dimension',
    description: 'Builds sdlc-team-dimension documents from github-intel-teams catalog data',
    category: 'security',
    tags: ['scheduled', 'github', 'ingest', 'sdlc', 'teams', 'dimension', 'foreach'],
    filename: 'sdlc_github_build_team_dimension.yml',
  },
  {
    id: 'sdlc_github_cross_link_entities',
    name: 'SDLC GitHub cross-link entities',
    description:
      'Links PRs to issues and project items via github-intel-relationships and delivery fields',
    category: 'security',
    tags: ['scheduled', 'github', 'ingest', 'sdlc', 'link', 'relationships', 'foreach'],
    filename: 'sdlc_github_cross_link_entities.yml',
  },
  {
    id: 'sdlc_github_project_epic_phases',
    name: 'SDLC GitHub project epic phases',
    description: 'Projects normalized Epic project items into sdlc-epic-phases',
    category: 'security',
    tags: ['scheduled', 'github', 'ingest', 'sdlc', 'epic', 'phases', 'foreach'],
    filename: 'sdlc_github_project_epic_phases.yml',
  },
  {
    id: 'sdlc_github_enrich_epic_phases',
    name: 'SDLC GitHub enrich epic phases',
    description:
      'Enriches sdlc-epic-phases with child tickets, merged PR counts, rollup coverage, and phase gate summaries',
    category: 'security',
    tags: ['scheduled', 'github', 'ingest', 'sdlc', 'epic', 'enrich', 'phases', 'foreach'],
    filename: 'sdlc_github_enrich_epic_phases.yml',
  },
  {
    id: 'sdlc_github_catalog_project_views',
    name: 'SDLC GitHub catalog project views (GraphQL)',
    description:
      'Pages GitHub Project v2 saved views via orgCatalog.projectViews into github-intel-project-views',
    category: 'security',
    tags: ['scheduled', 'github', 'graphql', 'ingest', 'sdlc', 'projects', 'views', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_project_views.yml',
  },
  {
    id: 'sdlc_github_build_release_calendar',
    name: 'SDLC GitHub build release calendar',
    description: 'Projects sdlc-epic-phases release milestones into sdlc-release-calendar',
    category: 'security',
    tags: ['scheduled', 'github', 'ingest', 'sdlc', 'release', 'calendar', 'foreach'],
    filename: 'sdlc_github_build_release_calendar.yml',
  },
  {
    id: 'sdlc_slack_thread_replies',
    name: 'SDLC Slack thread replies',
    description:
      'Ingests Slack thread replies via slack2.getConversationReplies into slack-intel-messages',
    category: 'security',
    tags: ['scheduled', 'slack', 'ingest', 'sdlc', 'messages', 'threads', 'foreach', 'while'],
    filename: 'sdlc_slack_thread_replies.yml',
  },
  {
    id: 'sdlc_salesforce_catalog_cases',
    name: 'SDLC Salesforce catalog cases',
    description:
      'Incremental Salesforce Case ingest via salesforce.soqlIngest into salesforce-intel-cases',
    category: 'security',
    tags: ['scheduled', 'salesforce', 'ingest', 'sdlc', 'cases', 'feedback', 'foreach', 'while'],
    filename: 'sdlc_salesforce_catalog_cases.yml',
  },
  {
    id: 'sdlc_github_catalog_sdh_issues',
    name: 'SDLC GitHub catalog SDH issues',
    description:
      'Repo-scoped SDH issue catalog via activity.searchIssues into github-intel-sdh-issues',
    category: 'security',
    tags: ['scheduled', 'github', 'ingest', 'sdlc', 'issues', 'sdh', 'feedback', 'foreach', 'while'],
    filename: 'sdlc_github_catalog_sdh_issues.yml',
  },
  {
    id: 'sdlc_cross_link_feedback_loop',
    name: 'SDLC cross-link feedback loop',
    description:
      'Bidirectional Salesforce Case to SDH GitHub issue linkage via github-intel-relationships',
    category: 'security',
    tags: ['scheduled', 'salesforce', 'github', 'ingest', 'sdlc', 'feedback', 'relationships'],
    filename: 'sdlc_cross_link_feedback_loop.yml',
  },
];

/** Allowlisted example IDs — prevents path traversal attacks when reading files */
export const WORKFLOW_EXAMPLE_IDS = new Set(WORKFLOW_EXAMPLES.map((e) => e.id));

/**
 * Get workflow example catalog entries, optionally filtered by category and/or search term.
 * Returns metadata only (no YAML content).
 */
export function getWorkflowExamples(filter?: {
  category?: string;
  search?: string;
}): WorkflowExampleEntry[] {
  let results = WORKFLOW_EXAMPLES;

  if (filter?.category) {
    const cat = filter.category.toLowerCase();
    results = results.filter((e) => e.category.toLowerCase().includes(cat));
  }

  if (filter?.search) {
    const term = filter.search.toLowerCase();
    results = results.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  return results;
}

/**
 * Look up a single catalog entry by id.
 */
export function getWorkflowExample(id: string): WorkflowExampleEntry | undefined {
  if (!WORKFLOW_EXAMPLE_IDS.has(id)) return undefined;
  return WORKFLOW_EXAMPLES.find((e) => e.id === id);
}

/**
 * Absolute path to the bundled examples directory.
 * Works in both dev and production because it uses `__dirname`.
 * Server-side callers can combine this with `readFileSync` to load YAML content.
 */
export function getWorkflowExamplesDir(): string {
  return __dirname;
}
