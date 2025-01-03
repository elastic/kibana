/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface Pipeline {
  id: string;
  url: string;
  web_url: string;
  name: string;
  slug: string;
  repository: string;
  builds_url: string;
  badge_url: string;
  created_at: string;
  default_branch: string;
  description: string;
  branch_configuration: string;
  skip_queued_branch_builds: boolean;
  skip_queued_branch_builds_filter: string;
  cancel_running_branch_builds: boolean;
  cancel_running_branch_builds_filter: string;
  cluster_id: string;

  scheduled_builds_count: number;
  running_builds_count: number;
  scheduled_jobs_count: number;
  running_jobs_count: number;
  waiting_jobs_count: number;

  provider: {
    id: string;
    webhook_url: string;
    settings: Record<string, string>;
  };

  steps: Step[];
  configuration: string;
  env: Record<string, string>;
}

export interface Step {
  type: string;
  name: string;
  command: string;
  artifact_paths: string;
  branch_configuration: string;
  env: Record<string, string>;
  timeout_in_minutes: number;
  agent_query_rules: string[];
}
