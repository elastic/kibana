/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { stringify } from 'yaml';

import { BuildkiteClient } from '#pipeline-utils';
import type { Job } from '#pipeline-utils';

import { FALLBACK_SLACK_CHANNEL, getChannelForStepLabel } from './failed_suite_channels';

const NOTIFY_STEP_KEY = 'notify_owning_teams';
const DRY_RUN = !!process.env.DRY_RUN?.match(/(1|true)/i);

export interface FailedJob {
  id: string;
  name: string;
  webUrl: string;
}

export function displayNameForJob(name: string): string {
  return name.replace(/ \/\s*\d+\s*\/\s*\d+\s*$/, '').replace(/ \(\d+\/\d+\)$/, '');
}

export function collectFailedScriptJobs(
  jobs: Job[],
  isSuccessful: (job: Job) => boolean
): FailedJob[] {
  return jobs
    .filter((job) => {
      if (job.type !== 'script') {
        return false;
      }
      if (job.retried) {
        return false;
      }
      if (job.step_key === NOTIFY_STEP_KEY) {
        return false;
      }
      return !isSuccessful(job);
    })
    .map((job) => ({
      id: job.id,
      name: job.name,
      webUrl: job.web_url,
    }));
}

export function groupJobsByChannel(jobs: FailedJob[]): Map<string, FailedJob[]> {
  const grouped = new Map<string, FailedJob[]>();
  for (const job of jobs) {
    const channel = getChannelForStepLabel(job.name);
    const list = grouped.get(channel) ?? [];
    list.push(job);
    grouped.set(channel, list);
  }
  return grouped;
}

export function composeChannelMessage(
  jobs: FailedJob[],
  buildUrl: string,
  buildNumber: string | number
): string {
  const unique = new Map<string, { job: FailedJob; count: number }>();
  for (const job of jobs) {
    const displayName = displayNameForJob(job.name);
    const existing = unique.get(displayName);
    if (existing) {
      existing.count += 1;
    } else {
      unique.set(displayName, { job, count: 1 });
    }
  }

  const lines = [...unique.entries()].map(([displayName, { job, count }]) => {
    const suffix = count > 1 ? ` (${count} failed jobs)` : '';
    return `• <${job.webUrl}|[job]> ${displayName}${suffix}`;
  });

  return [
    ':alert: *kibana-security-solution-on-merge* failed',
    '',
    'Parent kibana-on-merge is `soft_fail`, so treat this as release-blocking for Security.',
    '',
    ...lines,
    '',
    `<${buildUrl}|View build #${buildNumber}>`,
  ].join('\n');
}

export function buildNotifyPipelineYaml(channelToMessage: Map<string, string>): string {
  const notifySteps = [...channelToMessage.entries()].map(([channel, message]) => ({
    label: `:slack: Notify ${channel}`,
    command: 'true',
    timeout_in_minutes: 10,
    agents: {
      image: 'family/kibana-ubuntu-2404',
      imageProject: 'elastic-images-prod',
      provider: 'gcp',
      machineType: 'n2-standard-2',
      preemptible: true,
    },
    notify: [
      {
        slack: {
          channels: [channel],
          message,
        },
        if: 'step.outcome == "passed"',
      },
    ],
  }));

  // These steps are appended to a build that is already failing. Without a
  // continue_on_failure boundary Buildkite skips them and nothing reaches Slack.
  const steps: unknown[] = [{ wait: null, continue_on_failure: true }, ...notifySteps];

  return stringify({ steps });
}

function uploadNotifyPipeline(yaml: string): void {
  if (DRY_RUN || !process.env.BUILDKITE) {
    console.log(yaml);
    return;
  }

  execSync('buildkite-agent pipeline upload', {
    input: yaml,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

export async function notifyFailedSuites(
  buildkite: BuildkiteClient = new BuildkiteClient()
): Promise<void> {
  const build = await buildkite.getCurrentBuild();
  const failedJobs = collectFailedScriptJobs(build.jobs, (job) => {
    return buildkite.getJobStatus(build, job).success;
  });

  if (failedJobs.length === 0) {
    console.log('No failed Security on-merge steps to notify');
    return;
  }

  const grouped = groupJobsByChannel(failedJobs);
  const channelToMessage = new Map<string, string>();
  for (const [channel, jobs] of grouped) {
    channelToMessage.set(channel, composeChannelMessage(jobs, build.web_url, build.number));
  }

  const yaml = buildNotifyPipelineYaml(channelToMessage);
  console.log(
    `Uploading Slack notify steps for: ${[...channelToMessage.keys()].join(', ') || FALLBACK_SLACK_CHANNEL}`
  );
  uploadNotifyPipeline(yaml);
}

if (require.main === module) {
  notifyFailedSuites().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
