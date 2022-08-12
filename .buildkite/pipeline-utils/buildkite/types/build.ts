/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Job } from './job';
import { Pipeline } from './pipeline';

export type BuildState =
  | 'running'
  | 'scheduled'
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'canceled'
  | 'canceling'
  | 'skipped'
  | 'not_run'
  | 'finished';

export interface BuildStatus {
  state: BuildState;
  success: boolean;
  hasRetries: boolean;
  hasNonPreemptionRetries: boolean;
}

export interface Build {
  id: string;
  url: string;
  web_url: string;
  number: number;
  state: BuildState;
  blocked: boolean;
  message: string;
  commit: string;
  branch: string;
  author: { name: string; email: string };
  env: Record<string, string>;
  created_at: string;
  scheduled_at: string;
  started_at: string;
  finished_at: string;
  meta_data: Record<string, string>;
  creator: {
    avatar_url: string;
    created_at: string;
    email: string;
    id: string;
    name: string;
  };
  source: string;

  jobs: Job[];
  pipeline: Pipeline;
  pull_request?: {
    id: string;
    base: string;
    repository: string;
  };
}
