/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import axios, { AxiosInstance } from 'axios';
import { execSync, ExecSyncOptions } from 'child_process';
import { dump } from 'js-yaml';
import { parseLinkHeader } from './parse_link_header';
import { Artifact } from './types/artifact';
import { Build, BuildStatus } from './types/build';
import { Job, JobState } from './types/job';

type ExecType =
  | ((command: string, execOpts: ExecSyncOptions) => Buffer | null)
  | ((command: string, execOpts: ExecSyncOptions) => string | null);

export interface BuildkiteClientConfig {
  baseUrl?: string;
  token?: string;
  exec?: ExecType;
}

export interface BuildkiteGroup {
  group: string;
  steps: BuildkiteStep[];
}

export type BuildkiteStep = BuildkiteCommandStep | BuildkiteInputStep | BuildkiteTriggerStep;

export interface BuildkiteCommandStep {
  command: string;
  label: string;
  parallelism?: number;
  agents: {
    queue: string;
  };
  timeout_in_minutes?: number;
  key?: string;
  depends_on?: string | string[];
  retry?: {
    automatic: Array<{
      exit_status: string;
      limit: number;
    }>;
  };
  env?: { [key: string]: string };
}

interface BuildkiteInputTextField {
  text: string;
  key: string;
  hint?: string;
  required?: boolean;
  default?: string;
}

interface BuildkiteInputSelectField {
  select: string;
  key: string;
  hint?: string;
  required?: boolean;
  default?: string;
  multiple?: boolean;
  options: Array<{
    label: string;
    value: string;
  }>;
}

export interface BuildkiteInputStep {
  input: string;
  prompt?: string;
  fields: Array<BuildkiteInputTextField | BuildkiteInputSelectField>;
  if?: string;
  allow_dependency_failure?: boolean;
  branches?: string;
  parallelism?: number;
  agents?: {
    queue: string;
  };
  timeout_in_minutes?: number;
  key?: string;
  depends_on?: string | string[];
  retry?: {
    automatic: Array<{
      exit_status: string;
      limit: number;
    }>;
  };
  env?: { [key: string]: string };
}

export interface BuildkiteTriggerStep {
  trigger: string;
  label?: string;
  build?: {
    message?: string; // The message for the build. Supports emoji.
    commit?: string; // The commit hash for the build.
    branch?: string; // The branch for the build.
    meta_data?: string; // A map of meta-data for the build.
    env?: Record<string, string>; // A map of environment variables for the build.
  };
  async?: boolean;
  branches?: string;
  if?: string;
  allow_dependency_failure?: boolean;
  soft_fail?: boolean;
  depends_on?: string | string[];
  skip?: string;
}

export interface BuildkiteTriggerBuildParams {
  commit: string;
  branch: string;
  env?: Record<string, string>;
  author?: {
    name: string;
    email: string;
  };
  ignore_pipeline_branch_filters?: boolean;
  message?: string;
  meta_data?: Record<string, string>;
  pull_request_base_branch?: string;
  pull_request_id?: string | number;
  pull_request_repository?: string;
}

export class BuildkiteClient {
  http: AxiosInstance;
  exec: ExecType;

  constructor(config: BuildkiteClientConfig = {}) {
    const BUILDKITE_BASE_URL =
      config.baseUrl ?? process.env.BUILDKITE_BASE_URL ?? 'https://api.buildkite.com';
    const BUILDKITE_TOKEN = config.token ?? process.env.BUILDKITE_TOKEN;

    // const BUILDKITE_AGENT_BASE_URL =
    //   process.env.BUILDKITE_AGENT_BASE_URL || 'https://agent.buildkite.com/v3';
    // const BUILDKITE_AGENT_TOKEN = process.env.BUILDKITE_AGENT_TOKEN;

    this.http = axios.create({
      baseURL: BUILDKITE_BASE_URL,
      headers: {
        Authorization: `Bearer ${BUILDKITE_TOKEN}`,
      },
    });

    this.exec = config.exec ?? execSync;

    // this.agentHttp = axios.create({
    //   baseURL: BUILDKITE_AGENT_BASE_URL,
    //   headers: {
    //     Authorization: `Token ${BUILDKITE_AGENT_TOKEN}`,
    //   },
    // });
  }

  getBuild = async (
    pipelineSlug: string,
    buildNumber: string | number,
    includeRetriedJobs = false
  ): Promise<Build> => {
    // TODO properly assemble URL
    const link = `v2/organizations/elastic/pipelines/${pipelineSlug}/builds/${buildNumber}?include_retried_jobs=${includeRetriedJobs.toString()}`;
    const resp = await this.http.get(link);
    return resp.data as Build;
  };

  getBuildsAfterDate = async (
    pipelineSlug: string,
    date: string,
    numberOfBuilds: number
  ): Promise<Build[]> => {
    const response = await this.http.get(
      `v2/organizations/elastic/pipelines/${pipelineSlug}/builds?created_from=${date}&per_page=${numberOfBuilds}`
    );
    return response.data as Build[];
  };

  getBuildForCommit = async (pipelineSlug: string, commit: string): Promise<Build | null> => {
    if (commit.length !== 40) {
      throw new Error(`Invalid commit hash: ${commit}, this endpoint works with full SHAs only`);
    }

    const response = await this.http.get(
      `v2/organizations/elastic/pipelines/${pipelineSlug}/builds?commit=${commit}`
    );
    const builds = response.data as Build[];
    if (builds.length === 0) {
      return null;
    }
    return builds[0];
  };

  getCurrentBuild = (includeRetriedJobs = false) => {
    if (!process.env.BUILDKITE_PIPELINE_SLUG || !process.env.BUILDKITE_BUILD_NUMBER) {
      throw new Error(
        'BUILDKITE_PIPELINE_SLUG and BUILDKITE_BUILD_NUMBER must be set to get current build'
      );
    }

    return this.getBuild(
      process.env.BUILDKITE_PIPELINE_SLUG,
      process.env.BUILDKITE_BUILD_NUMBER,
      includeRetriedJobs
    );
  };

  getJobStatus = (build: Build, job: Job): { success: boolean; state: JobState } => {
    if (job.retried) {
      const retriedJob = build.jobs.find((j) => j.id === job.retried_in_job_id);
      if (!retriedJob) {
        throw Error(`Couldn't find retried job ID ${job.retried_in_job_id} for job ${job.id}`);
      }

      return this.getJobStatus(build, retriedJob);
    }

    let success: boolean;

    // "Manual" steps are for input, when they are skipped, they have state: broken in the API
    // So let's always mark them as successful, they can't really fail
    // `broken` used to be in this list, but has been removed, it's essentially another type of skip status
    // https://buildkite.com/docs/pipelines/defining-steps#job-states - See "Differentiating between broken, skipped and canceled states:"
    success =
      job.type === 'manual' ||
      ![
        'failed',
        'timed_out',
        'timing_out',
        'waiting_failed',
        'unblocked_failed',
        'blocked_failed',
      ].includes(job.state);

    if (job.soft_failed) {
      success = true;
    }

    return {
      success,
      state: job.state,
    };
  };

  getBuildStatus = (build: Build): BuildStatus => {
    let hasRetries = false;
    let hasNonPreemptionRetries = false;
    let success = build.state !== 'failed';

    for (const job of build.jobs) {
      if (job.retried) {
        hasRetries = true;
        const isPreemptionFailure =
          job.state === 'failed' &&
          job.agent?.meta_data?.includes('spot=true') &&
          job.exit_status === -1;

        if (!isPreemptionFailure) {
          hasNonPreemptionRetries = true;
        }
      }

      const state = this.getJobStatus(build, job);
      success = success && state.success;
    }

    return {
      state: build.state,
      success,
      hasRetries,
      hasNonPreemptionRetries,
    };
  };

  getCurrentBuildStatus = async (includeRetriedJobs = false) => {
    return this.getBuildStatus(await this.getCurrentBuild(includeRetriedJobs));
  };

  getArtifacts = async (
    pipelineSlug: string,
    buildNumber: string | number
  ): Promise<Artifact[]> => {
    let link = `v2/organizations/elastic/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts?per_page=100`;
    const artifacts = [];

    // Don't get stuck in an infinite loop or follow more than 50 pages
    for (let i = 0; i < 50; i++) {
      if (!link) {
        break;
      }

      const resp = await this.http.get(link);
      link = '';

      artifacts.push(await resp.data);

      if (resp.headers.link) {
        const result = parseLinkHeader(resp.headers.link as string);
        if (result?.next) {
          link = result.next;
        }
      }
    }

    return artifacts.flat();
  };

  getArtifactsForCurrentBuild = (): Promise<Artifact[]> => {
    if (!process.env.BUILDKITE_PIPELINE_SLUG || !process.env.BUILDKITE_BUILD_NUMBER) {
      throw new Error(
        'BUILDKITE_PIPELINE_SLUG and BUILDKITE_BUILD_NUMBER must be set to get current build'
      );
    }

    return this.getArtifacts(
      process.env.BUILDKITE_PIPELINE_SLUG,
      process.env.BUILDKITE_BUILD_NUMBER
    );
  };

  // https://buildkite.com/docs/apis/rest-api/builds#create-a-build
  triggerBuild = async (
    pipelineSlug: string,
    options: BuildkiteTriggerBuildParams
  ): Promise<Build> => {
    const url = `v2/organizations/elastic/pipelines/${pipelineSlug}/builds`;

    return (await this.http.post(url, options)).data;
  };

  setMetadata = (key: string, value: string) => {
    this.exec(`buildkite-agent meta-data set '${key}'`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  };

  getMetadata(key: string, defaultValue: string | null = null): string | null {
    try {
      const stdout = this.exec(`buildkite-agent meta-data get '${key}'`, {
        stdio: ['pipe'],
      });
      return stdout?.toString().trim() || defaultValue;
    } catch (e) {
      if (e.message.includes('404 Not Found')) {
        return defaultValue;
      } else {
        throw e;
      }
    }
  }

  setAnnotation = (
    context: string,
    style: 'info' | 'success' | 'warning' | 'error',
    value: string,
    append: boolean = false
  ) => {
    this.exec(
      `buildkite-agent annotate --context '${context}' --style '${style}' ${
        append ? '--append' : ''
      }`,
      {
        input: value,
        stdio: ['pipe', 'inherit', 'inherit'],
      }
    );
  };

  uploadArtifacts = (pattern: string) => {
    this.exec(`buildkite-agent artifact upload '${pattern}'`, {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  };

  uploadSteps = (steps: Array<BuildkiteStep | BuildkiteGroup>) => {
    this.exec(`buildkite-agent pipeline upload`, {
      input: dump({ steps }),
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  };
}
