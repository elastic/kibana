/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import path from 'path';
import { stringify } from 'yaml';

import {
  DEFAULT_FALLBACK_SLACK_CHANNEL,
  SUITES_CONFIG_RELATIVE_PATH,
  findSuiteForStepLabel,
  getFallbackSlackChannel,
  stripShardSuffix,
} from './failed_suite_channels.ts';
import { BuildkiteClient } from '#pipeline-utils';
import type { Job } from '#pipeline-utils';

const NOTIFY_STEP_KEY = 'notify_owning_teams';
/** Slack truncates a message block at 3000 chars; stay under it with headroom for mrkdwn expansion. */
const SLACK_MESSAGE_CHAR_BUDGET = 2800;
/** Keeps a stack trace or API error body from crowding out the rest of the fallback message. */
const MAX_ERROR_DETAIL_CHARS = 500;
/** Set after a successful pipeline upload so a retried notify step cannot double-post. */
export const SLACK_NOTIFY_UPLOADED_META_KEY = 'security_solution_on_merge:slack_notify_uploaded';
const DRY_RUN = !!process.env.DRY_RUN?.match(/(1|true)/i);

const NOTIFY_STEP_KEY_PREFIX = 'notify-owning-team-';

export function slackNotifyStepKey(channel: string): string {
  return `${NOTIFY_STEP_KEY_PREFIX}${channel.replace(/^#/, '').replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

/**
 * Whether a previous attempt already queued notify steps into this build.
 *
 * The meta-data marker is written after the upload, so an agent lost in between
 * leaves no marker behind. Re-uploading the same deterministic keys would either
 * duplicate the messages or be rejected as duplicates and raise a false SDH
 * alarm, so treat the build's own steps as the source of truth.
 */
export function hasUploadedNotifySteps(jobs: Job[]): boolean {
  return jobs.some((job) => job.step_key?.startsWith(NOTIFY_STEP_KEY_PREFIX));
}

export interface FailedJob {
  id: string;
  name: string;
  webUrl: string;
}

export function displayNameForJob(name: string): string {
  return stripShardSuffix(name);
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

export interface ChannelGroup {
  jobs: FailedJob[];
  /** Step labels with no entry in the suites config; these landed here via fallback. */
  unmappedLabels: string[];
}

export function groupJobsByChannel(jobs: FailedJob[]): Map<string, ChannelGroup> {
  const fallbackChannel = getFallbackSlackChannel();
  const grouped = new Map<string, ChannelGroup>();

  for (const job of jobs) {
    const displayName = displayNameForJob(job.name);
    const suite = findSuiteForStepLabel(displayName);
    const channel = suite?.slackChannel ?? fallbackChannel;

    const group = grouped.get(channel) ?? { jobs: [], unmappedLabels: [] };
    group.jobs.push(job);
    if (!suite && !group.unmappedLabels.includes(displayName)) {
      group.unmappedLabels.push(displayName);
    }
    grouped.set(channel, group);
  }

  return grouped;
}

export function composeChannelMessage(
  jobs: FailedJob[],
  buildUrl: string,
  buildNumber: string | number,
  options: { unmappedLabels?: string[] } = {}
): string {
  const unmappedLabels = options.unmappedLabels ?? [];

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

  const candidates = [...unique.entries()].map(([displayName, { job, count }]) => {
    const suffix = count > 1 ? ` (${count} failed jobs)` : '';
    return `• <${job.webUrl}|[job]> ${displayName}${suffix}`;
  });

  const omissionLine = (count: number) => `• …and ${count} more failed step${count > 1 ? 's' : ''}`;

  // Unmapped steps reach this channel via fallback, so say so. Otherwise the message
  // is indistinguishable from a real alert for this channel and the gap goes unnoticed.
  const unmappedNotice =
    unmappedLabels.length > 0
      ? [
          `:grey_question: ${unmappedLabels.length} step${
            unmappedLabels.length > 1 ? 's have' : ' has'
          } no owning-team mapping and landed here by fallback.`,
          `Add ${unmappedLabels.length > 1 ? 'them' : 'it'} to \`${SUITES_CONFIG_RELATIVE_PATH}\`.`,
          '',
        ]
      : [];

  const render = (lines: string[]) =>
    [
      ':alert: *kibana-security-solution-on-merge* failed',
      '',
      'Parent kibana-on-merge is `soft_fail`, so treat this as release-blocking for Security.',
      '',
      ...unmappedNotice,
      ...lines,
      '',
      `<${buildUrl}|View build #${buildNumber}>`,
    ].join('\n');

  // Job URLs and suite labels are unbounded, so budget by rendered length rather than
  // by entry count. Reserve room for the omission line whenever anything is dropped,
  // sized against the total so its digit count can never push the message over.
  const listed: string[] = [];
  for (const [index, candidate] of candidates.entries()) {
    const isLast = index === candidates.length - 1;
    const projected = isLast
      ? [...listed, candidate]
      : [...listed, candidate, omissionLine(candidates.length)];

    if (render(projected).length > SLACK_MESSAGE_CHAR_BUDGET) {
      break;
    }
    listed.push(candidate);
  }

  const omitted = candidates.length - listed.length;
  return render(omitted > 0 ? [...listed, omissionLine(omitted)] : listed);
}

/**
 * Flatten an error for embedding in Slack and Buildkite annotations.
 *
 * Stack traces and multi-line API error bodies are unbounded, and this runs on
 * the path where everything else has already failed, so it must not be the
 * reason the message is truncated or rejected.
 */
export function summarizeErrorDetail(error: unknown, maxLength = MAX_ERROR_DETAIL_CHARS): string {
  const raw = error instanceof Error ? error.message : String(error);
  const flattened = raw.replace(/\s+/g, ' ').trim();

  if (flattened.length === 0) {
    return 'unknown error';
  }

  return flattened.length > maxLength ? `${flattened.slice(0, maxLength - 1)}…` : flattened;
}

export function composeFanOutFailureMessage(
  error: unknown,
  buildUrl = process.env.BUILDKITE_BUILD_URL,
  buildNumber: string | number | undefined = process.env.BUILDKITE_BUILD_NUMBER
): string {
  const detail = summarizeErrorDetail(error);
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
    // The repo pre-command hook otherwise runs node setup + `npm ci` on a step that
    // only needs to exit 0; a flake there would fail the step and drop the message.
    env: {
      SKIP_NODE_SETUP: 'true',
    },
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
    // Log a summary only — Axios errors embed Authorization: Bearer BUILDKITE_TOKEN.
    console.error(
      `Failed to set ${SLACK_NOTIFY_UPLOADED_META_KEY} after Slack notify upload; continuing: ${summarizeErrorDetail(
        error
      )}`
    );
  }
}

export function annotateUnmappedSteps(buildkite: BuildkiteClient, unmappedLabels: string[]): void {
  if (unmappedLabels.length === 0) {
    return;
  }

  const lines = unmappedLabels.map((label) => `- \`${label}\``).join('\n');
  console.warn(`Steps with no owning-team mapping: ${unmappedLabels.join(', ')}`);

  const body = [
    'These failed steps have no owning-team Slack mapping and were sent to the fallback channel.',
    `Add them to \`${SUITES_CONFIG_RELATIVE_PATH}\`:`,
    lines,
  ].join('\n');

  try {
    buildkite.setAnnotation('security-solution-on-merge-unmapped-steps', 'warning', body);
  } catch (error) {
    // Best effort: the Slack messages already carry the same warning.
    console.error(`Failed to annotate unmapped steps: ${summarizeErrorDetail(error)}`);
  }
}

function notifyFanOutFailure(
  error: unknown,
  buildkite: BuildkiteClient,
  upload: (yaml: string) => void
): void {
  const detail = summarizeErrorDetail(error);
  // Reading the suites config can itself be what failed, so never let the fallback
  // lookup throw inside the fallback path.
  let fallbackChannel: string;
  try {
    fallbackChannel = getFallbackSlackChannel();
  } catch {
    fallbackChannel = DEFAULT_FALLBACK_SLACK_CHANNEL;
  }

  // Annotate before the Slack upload so Buildkite still surfaces the miss when
  // pipeline upload itself is broken.
  try {
    buildkite.setAnnotation(
      'security-solution-on-merge-slack-fanout',
      'error',
      `Owning-team Slack fan-out failed; alerting ${fallbackChannel}. ${detail}`
    );
  } catch (annotationError) {
    console.error(`Failed to annotate fan-out failure: ${summarizeErrorDetail(annotationError)}`);
  }

  const message = composeFanOutFailureMessage(error);
  const yaml = buildNotifyPipelineYaml(new Map([[fallbackChannel, message]]), {
    // Distinct from a successful unmatched-step notify to the same channel.
    stepKey: () => 'notify-owning-team-fanout-failure',
  });

  console.error(`Fan-out failed; uploading fallback Slack notify to ${fallbackChannel}`);
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

  // Covers the agent-loss window the `-1` retry exists for: upload succeeded,
  // then the agent died before the marker was written.
  if (hasUploadedNotifySteps(build.jobs)) {
    console.log('Notify steps are already present in this build; skipping');
    markSlackNotifyUploaded(buildkite);
    return;
  }

  const failedJobs = collectFailedScriptJobs(build.jobs, (job) => {
    return buildkite.getJobStatus(build, job).success;
  });

  if (failedJobs.length === 0) {
    console.log('No failed Security on-merge steps to notify');
    return;
  }

  const grouped = groupJobsByChannel(failedJobs);
  const channelToMessage = new Map<string, string>();
  const allUnmappedLabels: string[] = [];

  for (const [channel, { jobs, unmappedLabels }] of grouped) {
    channelToMessage.set(
      channel,
      composeChannelMessage(jobs, build.web_url, build.number, { unmappedLabels })
    );
    allUnmappedLabels.push(...unmappedLabels);
  }

  annotateUnmappedSteps(buildkite, allUnmappedLabels);

  const yaml = buildNotifyPipelineYaml(channelToMessage);
  console.log(`Uploading Slack notify steps for: ${[...channelToMessage.keys()].join(', ')}`);
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
    // Never log the raw error: Axios failures embed Authorization headers.
    console.error(
      `Failed to fan out Security on-merge Slack alerts: ${summarizeErrorDetail(error)}`
    );
    try {
      notifyFanOutFailure(error, buildkite, upload);
    } catch (fallbackError) {
      console.error(
        `Also failed to notify the fallback channel about the fan-out failure: ${summarizeErrorDetail(
          fallbackError
        )}`
      );
    }
    throw error;
  }
}

if (path.basename(process.argv[1] ?? '') === 'notify_failed_suites.ts') {
  notifyFailedSuites().catch((error) => {
    console.error(summarizeErrorDetail(error));
    process.exit(1);
  });
}
