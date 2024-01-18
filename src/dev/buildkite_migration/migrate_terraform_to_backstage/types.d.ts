/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type AccessLevel = 'MANAGE_BUILD_READ' | 'BUILD_AND_READ' | 'READ_ONLY';

export interface ResourceDictionary<T> {
  [resourceName: string]: [T];
}

export type TypeWithExtraFields<T> = T & Partial<{ [key: string]: any }>;

export interface Hcl2JsonModelForKibanaBuildkite {
  resource:
    | {
        [resourceKind: 'buildkite_pipeline']: ResourceDictionary<BuildkitePipelineConfig>;
      }
    | {
        [resourceKind: 'github_repository_webhook']: ResourceDictionary<WebhookConfig>;
      }
    | {
        [resourceKind: 'buildkite_pipeline_schedule']: ResourceDictionary<BuildkiteScheduleConfig>;
      }
    | {
        [resourceKind: string]: ResourceDictionary<any>;
      };
}

export type KibanaBuildkiteModel =
  | BuildkitePipelineConfig
  | BuildkiteScheduleConfig
  | WebhookConfig;

interface BuildkiteScheduleConfig {
  branch?: string;
  cronline?: string;
  label?: string;
  pipeline_id?: string;
  for_each?: string;
  env: any;
}
type WebhookConfig = any;

export interface BuildkitePipelineConfig {
  branch_configuration: string;
  cancel_intermediate_builds: boolean;
  default_branch: string;
  description: string;
  name: string;
  provider_settings: ProviderSettings[];
  repository: string;
  steps: string;
  team: Team[];

  for_each: string;
  skip_intermediate_builds: boolean;
}

export interface ProviderSettings {
  build_branches: boolean;
  build_pull_requests: boolean;
  publish_commit_status: boolean;
  skip_pull_request_builds_for_existing_commits: boolean;
  trigger_mode: 'none' | 'code' | 'deployment' | 'fork';

  build_tags: boolean;
  skip_builds_for_existing_commits: boolean;
}

export interface Team {
  access_level: AccessLevel;
  slug: string;
}
