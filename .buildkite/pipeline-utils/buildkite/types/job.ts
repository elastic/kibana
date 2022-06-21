import { Agent } from './agent';

export type JobState =
  | 'pending'
  | 'waiting'
  | 'waiting_failed'
  | 'blocked'
  | 'blocked_failed'
  | 'unblocked'
  | 'unblocked_failed'
  | 'limiting'
  | 'limited'
  | 'scheduled'
  | 'assigned'
  | 'accepted'
  | 'running'
  | 'passed'
  | 'failed'
  | 'canceling'
  | 'canceled'
  | 'timing_out'
  | 'timed_out'
  | 'skipped'
  | 'broken';

export type Job = {
  id: string;
  type: string;
  name: string;
  step_key: string;
  state: JobState;
  logs_url: string;
  raw_log_url: string;
  command: string;
  exit_status: null | number;
  artifact_paths: string;
  artifacts_url: string;
  created_at: string;
  scheduled_at: string;
  runnable_at: string;
  started_at: string;
  finished_at: string;
  agent: Agent;
  agent_query_rules: string[];
  web_url: string;
  retried: boolean;
  retried_in_job_id: string;
  retries_count: number;
  soft_failed: boolean;
  unblocked_by: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
    created_at: string;
  };
  unblockable: boolean;
  unblock_url: string;
  parallel_group_index?: null | number;
  parallel_group_total?: null | number;
};
