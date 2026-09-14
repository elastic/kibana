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

import { FALLBACK_SLACK_CHANNEL, getChannelForStepLabel } from './failed_suite_channels.ts';
import { BuildkiteClient } from '#pipeline-utils';
import type { Job } from '#pipeline-utils';

const NOTIFY_STEP_KEY = 'notify_owning_teams';
/** Set after a successful pipeline upload so a retried notify step cannot double-post. */
export const SLACK_NOTIFY_UPLOADED_META_KEY = 'security_solution_on_merge:slack_notify_uploaded';
const DRY_RUN = !!process.env.DRY_RUN?.match(/(1|true)/i);

export function slackNotifyStepKey(channel: string): string {
  return `notify-owning-team-${channel.replace(/^#/, '').replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

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

export function composeFanOutFailureMessage(
  error: unknown,
  buildUrl = process.env.BUILDKITE_BUILD_URL,
  buildNumber: string | number | undefined = process.env.BUILDKITE_BUILD_NUMBER
): string {
  const detail = error instanceof Error ? error.message : String(error);
  const lines = [
    ':warning: *kibana-security-solution-on-merge* owning-team Slack fan-out failed',
    '',
    'Cypress may be red, but team channels were not notified. Please check the build and page owning teams manually.',
    '',
    `\`notify_owning_teams\` error: ${detail}`,
  ];

  if (buildUrl) {
    const label =
      buildNumber !== undefined && buildNumber !== '' ? `View build #${buildNumber}` : 'View build';
    lines.push('', `<${buildUrl}|${label}>`);
  }

  return lines.join('\n');
}

export function buildNotifyPipelineYaml(
  channelToMessage: Map<string, string>,
  options: { stepKey?: (channel: string) => string } = {}
): string {
  const stepKeyFor = options.stepKey ?? slackNotifyStepKey;
  const notifySteps = [...channelToMessage.entries()].map(([channel, message]) => ({
    label: `:slack: Notify ${channel}`,
    key: stepKeyFor(channel),
    command: 'true',
    timeout_in_minutes: 10,
    // Non-preemptible: these steps only run `true` + notify.slack, and Slack is
    // gated on step.outcome == passed. Preemption would drop the message.
    agents: {
      image: 'family/kibana-ubuntu-2404',
      imageProject: 'elastic-images-prod',
      provider: 'gcp',
      machineType: 'n2-standard-2',
      preemptible: false,
    },
    // Safe to retry leaf notify steps: Slack only fires when the attempt passes.
    // Meta-data is already set after fan-out upload, so a flake here won't SDH-fallback.
    retry: {
      automatic: [{ exit_status: -1, limit: 3 }],
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

  return stringify({ steps }, { lineWidth: 0 });
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

function markSlackNotifyUploaded(buildkite: BuildkiteClient): void {
  if (DRY_RUN || !process.env.BUILDKITE) {
    return;
  }

  try {
    buildkite.setMetadata(SLACK_NOTIFY_UPLOADED_META_KEY, 'true');
  } catch (error) {
    // Upload already succeeded; do not treat metadata failure as a fan-out miss
    // (that would false-alarm #sdh-security-team while team notifies are queued).
    console.error(
      `Failed to set ${SLACK_NOTIFY_UPLOADED_META_KEY} after Slack notify upload; continuing`,
      error
    );
  }
}

function notifyFanOutFailure(
  error: unknown,
  buildkite: BuildkiteClient,
  upload: (yaml: string) => void
): void {
  const detail = error instanceof Error ? error.message : String(error);

  // Annotate before the Slack upload so Buildkite still surfaces the miss when
  // pipeline upload itself is broken.
  try {
    buildkite.setAnnotation(
      'security-solution-on-merge-slack-fanout',
      'error',
      `Owning-team Slack fan-out failed; alerting ${FALLBACK_SLACK_CHANNEL}. ${detail}`
    );
  } catch (annotationError) {
    console.error('Failed to annotate fan-out failure', annotationError);
  }

  const message = composeFanOutFailureMessage(error);
  const yaml = buildNotifyPipelineYaml(new Map([[FALLBACK_SLACK_CHANNEL, message]]), {
    // Distinct from a successful unmatched-step notify to the same channel.
    stepKey: () => 'notify-owning-team-fanout-failure',
  });

  console.error(`Fan-out failed; uploading fallback Slack notify to ${FALLBACK_SLACK_CHANNEL}`);
  upload(yaml);
  markSlackNotifyUploaded(buildkite);
}

async function runNotifyFailedSuites(
  buildkite: BuildkiteClient,
  upload: (yaml: string) => void
): Promise<void> {
  if (process.env.BUILDKITE && buildkite.getMetadata(SLACK_NOTIFY_UPLOADED_META_KEY)) {
    console.log('Slack notify pipeline already uploaded for this build; skipping');
    return;
  }

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
    `Uploading Slack notify steps for: ${
      [...channelToMessage.keys()].join(', ') || FALLBACK_SLACK_CHANNEL
    }`
  );
  upload(yaml);

  // Mark after a successful upload so a retried notify step cannot double-post.
  // Metadata failures must not invert success into an SDH false alarm.
  markSlackNotifyUploaded(buildkite);
}

export async function notifyFailedSuites(
  buildkite: BuildkiteClient = new BuildkiteClient(),
  options: { upload?: (yaml: string) => void } = {}
): Promise<void> {
  const upload = options.upload ?? uploadNotifyPipeline;

  try {
    await runNotifyFailedSuites(buildkite, upload);
  } catch (error) {
    console.error('Failed to fan out Security on-merge Slack alerts', error);
    try {
      notifyFanOutFailure(error, buildkite, upload);
    } catch (fallbackError) {
      console.error(
        `Also failed to notify ${FALLBACK_SLACK_CHANNEL} about the fan-out failure`,
        fallbackError
      );
    }
    throw error;
  }
}

if (require.main === module) {
  notifyFailedSuites().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
