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
    description:
      'Triggers an AI agent to triage a security alert via kibana.post_agent_builder_converse',
    category: 'security',
    tags: ['alert', 'agent-builder', 'ai', 'console'],
    filename: 'invoke_agent.yml',
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
