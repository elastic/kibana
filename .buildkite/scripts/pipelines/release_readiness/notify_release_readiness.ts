/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Evaluates release readiness signals for serverless (MKI) releases and posts a
// summary to #kibana-mission-control ahead of the release.
//
// Signals:
//   - FTR tests pass on MKI on the latest `dev` commit (appex-qa-serverless-kibana-ftr-tests)
//   - The commit in `dev` has been promoted less than 6h ago (elastic/serverless-gitops)

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import type { Octokit } from '@octokit/rest';

import { BuildkiteClient, getGithubClient } from '#pipeline-utils';
import type { BuildState } from '#pipeline-utils';

const GITOPS_REPO = { owner: 'elastic', repo: 'serverless-gitops' } as const;
const VERSIONS_FILE_PATH = 'services/kibana/versions.yaml';
const DEV_PROMOTION_MESSAGE_PREFIX = 'gitops: dev Artifact promotion for kibana';

const FTR_PIPELINE_SLUG = 'appex-qa-serverless-kibana-ftr-tests';
const FTR_BUILD_SEARCH_WINDOW_HOURS = 48;

const DEFAULT_MAX_PROMOTION_AGE_HOURS = 6;
const DRY_RUN = !!process.env.DRY_RUN?.match(/(1|true)/i);

export interface Signal {
  description: string;
  passed: boolean;
  /** Passed, but with a caveat worth surfacing (e.g. FTR tested an older commit). */
  warning?: boolean;
  details: string;
}

export interface DevPromotion {
  promotedSha: string;
  promotedAt: Date;
  url: string;
}

export interface FtrRunInfo {
  number: number;
  state: BuildState;
  webUrl: string;
  testedCommit: string;
}

/** Extracts the `dev` commit from the kibana versions file in serverless-gitops. */
export function parseDevCommit(versionsFileContent: string): string {
  const sha = versionsFileContent.match(/^\s*dev: "([a-f0-9]+)"$/m)?.[1];

  if (!sha) {
    throw new Error(`Could not find the dev commit in ${VERSIONS_FILE_PATH}`);
  }

  return sha;
}

/** Extracts the promoted sha from a gitops promotion commit message, or null if it isn't one. */
export function parsePromotionMessage(message: string): string | null {
  const firstLine = message.split('\n')[0];
  if (!firstLine.startsWith(DEV_PROMOTION_MESSAGE_PREFIX)) {
    return null;
  }

  // e.g. 'gitops: dev Artifact promotion for kibana to 5eaea1e3a76a (#160169)'
  return firstLine.match(/ to ([a-f0-9]+)/)?.[1] ?? null;
}

/** Compares two commit SHAs by prefix, tolerating mixed short/full SHA formats. */
export function commitsMatch(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left.startsWith(right) || right.startsWith(left);
}

function formatAge(date: Date, now: Date): string {
  const ageMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (ageMinutes < 60) {
    return `${ageMinutes}m ago`;
  }
  return `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m ago`;
}

export interface ReadinessInput {
  ftrRun: FtrRunInfo | null;
  devCommit: string;
  promotion: DevPromotion;
  maxPromotionAgeHours: number;
  now: Date;
}

export function buildSignals(input: ReadinessInput): Signal[] {
  const { ftrRun, devCommit, promotion, maxPromotionAgeHours, now } = input;

  const promotionAgeHours = (now.getTime() - promotion.promotedAt.getTime()) / (60 * 60 * 1000);
  const promotionSignal: Signal = {
    description: `The commit in \`dev\` has been promoted less than ${maxPromotionAgeHours}h ago`,
    passed: promotionAgeHours <= maxPromotionAgeHours,
    details: `<${promotion.url}|\`${promotion.promotedSha}\`> promoted ${formatAge(
      promotion.promotedAt,
      now
    )}`,
  };

  if (!ftrRun) {
    return [
      {
        description: 'FTR tests pass on MKI on the latest `dev` commit',
        passed: false,
        details: `no FTR run found in the last ${FTR_BUILD_SEARCH_WINDOW_HOURS}h`,
      },
      promotionSignal,
    ];
  }

  const buildLink = `<${ftrRun.webUrl}|build #${ftrRun.number}>`;
  const onCurrentDevCommit = commitsMatch(ftrRun.testedCommit, devCommit);
  const commitNote = onCurrentDevCommit
    ? `current \`dev\` commit \`${ftrRun.testedCommit}\``
    : `\`dev\` commit \`${ftrRun.testedCommit}\` — the current \`dev\` commit \`${devCommit}\` has not been FTR-tested yet`;
  const stateNote =
    ftrRun.state === 'passed'
      ? 'passed'
      : ftrRun.state === 'failed'
      ? 'failed'
      : `is ${ftrRun.state}`;

  const ftrSignal: Signal = {
    // Only claim the latest `dev` commit was tested when it actually was
    description: onCurrentDevCommit
      ? 'FTR tests pass on MKI on the latest `dev` commit'
      : 'FTR tests pass on MKI',
    passed: ftrRun.state === 'passed',
    warning: ftrRun.state === 'passed' && !onCurrentDevCommit,
    details: `${buildLink} ${stateNote} on ${commitNote}`,
  };

  return [ftrSignal, promotionSignal];
}

export function composeMessage(signals: Signal[]): string {
  const ready = signals.every((signal) => signal.passed);
  const header = ready
    ? ':white_check_mark: Kibana is currently ready for a MKI release, based on the following signals:'
    : ':x: Kibana is currently *not* ready for a MKI release, based on the following signals:';

  const lines = signals.map((signal) => {
    const emoji = signal.warning ? ':warning:' : signal.passed ? ':white_check_mark:' : ':x:';
    return `${emoji} ${signal.description} (${signal.details})`;
  });

  return [header, ...lines].join('\n');
}

/** Reads the kibana commit currently deployed to the `dev` environment. */
async function getCurrentDevCommit(octokit: Octokit): Promise<string> {
  const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    ...GITOPS_REPO,
    path: VERSIONS_FILE_PATH,
  });

  const { data } = response;
  if (Array.isArray(data) || !('content' in data)) {
    throw new Error(`Expected ${VERSIONS_FILE_PATH} to be a file`);
  }

  return parseDevCommit(Buffer.from(data.content, 'base64').toString('utf8'));
}

/** Finds the most recent gitops promotion of a kibana commit to the `dev` environment. */
async function getLastDevPromotion(octokit: Octokit): Promise<DevPromotion> {
  const commits = await octokit.repos.listCommits({
    ...GITOPS_REPO,
    path: VERSIONS_FILE_PATH,
    per_page: 50,
  });

  for (const commit of commits.data) {
    const promotedSha = parsePromotionMessage(commit.commit.message);
    const promotedAt = commit.commit.committer?.date;
    if (promotedSha && promotedAt) {
      return { promotedSha, promotedAt: new Date(promotedAt), url: commit.html_url };
    }
  }

  throw new Error(
    `No '${DEV_PROMOTION_MESSAGE_PREFIX}' commit found in the recent history of ${VERSIONS_FILE_PATH}`
  );
}

/** Finds the most recent finished FTR-on-MKI run against a kibana `dev` commit. */
async function getLatestFtrRun(buildkite: BuildkiteClient): Promise<FtrRunInfo | null> {
  const since = new Date(Date.now() - FTR_BUILD_SEARCH_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const builds = await buildkite.getBuildsAfterDate(FTR_PIPELINE_SLUG, since, 100);

  // Only runs triggered by appex-qa-serverless-tests-trigger carry the kibana
  // `dev` commit under test in KIBANA_COMMIT; other runs (e.g. ES update checks)
  // don't test kibana on MKI.
  const kibanaRuns = builds.filter((build) => build.env?.KIBANA_COMMIT);
  const run =
    kibanaRuns.find((build) => ['passed', 'failed'].includes(build.state)) ?? kibanaRuns[0];

  if (!run) {
    return null;
  }

  return {
    number: run.number,
    state: run.state,
    webUrl: run.web_url,
    testedCommit: run.env.KIBANA_COMMIT,
  };
}

function getMaxPromotionAgeHours(): number {
  const raw = process.env.MAX_PROMOTION_AGE_HOURS;
  if (raw === undefined) {
    return DEFAULT_MAX_PROMOTION_AGE_HOURS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid MAX_PROMOTION_AGE_HOURS: "${raw}" — expected a positive number`);
  }
  return parsed;
}

/** Sends the message via the org-level Buildkite Slack integration using an uploaded notify step. */
function sendSlackNotification(message: string): void {
  const channel = process.env.SLACK_NOTIFICATIONS_CHANNEL;

  if (DRY_RUN || process.env.KIBANA_SLACK_NOTIFICATIONS_ENABLED !== 'true' || !channel) {
    console.log(`Not sending slack message (DRY_RUN=${DRY_RUN}, channel=${channel}):\n${message}`);
    return;
  }

  if (!process.env.BUILDKITE) {
    console.log(`Not running in Buildkite, not sending slack message:\n${message}`);
    return;
  }

  const notifyYaml = [
    'steps:',
    '  - label: ":slack: Release Readiness Notify"',
    `    command: "echo 'Release readiness report sent to Slack'"`,
    '    agents:',
    '      image: family/kibana-ubuntu-2404',
    '      imageProject: elastic-images-prod',
    '      provider: gcp',
    '      machineType: n2-standard-2',
    '      preemptible: true',
    '    notify:',
    '      - slack:',
    '          channels:',
    `            - "${channel}"`,
    '          message: |',
    ...message.split('\n').map((line) => `            ${line}`),
    '        if: step.outcome == "passed"',
    '',
  ].join('\n');

  const notifyFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'release-readiness-')),
    'notify.yml'
  );
  fs.writeFileSync(notifyFile, notifyYaml);
  execSync(`buildkite-agent pipeline upload "${notifyFile}"`, { stdio: 'inherit' });
}

async function main() {
  const octokit = getGithubClient();
  const buildkite = new BuildkiteClient();

  const [devCommit, promotion, ftrRun] = await Promise.all([
    getCurrentDevCommit(octokit),
    getLastDevPromotion(octokit),
    getLatestFtrRun(buildkite),
  ]);

  const signals = buildSignals({
    ftrRun,
    devCommit,
    promotion,
    maxPromotionAgeHours: getMaxPromotionAgeHours(),
    now: new Date(),
  });
  const message = composeMessage(signals);

  console.log(`Release readiness:\n${message}`);
  sendSlackNotification(message);

  if (process.env.BUILDKITE && !DRY_RUN) {
    const ready = signals.every((signal) => signal.passed);
    execSync(
      `buildkite-agent annotate --context release-readiness --style "${
        ready ? 'success' : 'error'
      }"`,
      { input: message, stdio: ['pipe', 'inherit', 'inherit'] }
    );
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
