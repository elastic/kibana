export type Pipeline = {
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
};

export type Step = {
  type: string;
  name: string;
  command: string;
  artifact_paths: string;
  branch_configuration: string;
  env: Record<string, string>;
  timeout_in_minutes: number;
  agent_query_rules: string[];
};
