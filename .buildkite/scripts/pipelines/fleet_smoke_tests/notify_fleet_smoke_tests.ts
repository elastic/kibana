/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Checks fleet-smoke-tests and alerts Slack when:
// - the last N finished scheduled builds all failed (sustained failures), or
// - a build triggered by the Kibana serverless QA quality gate failed since the previous check.

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { BuildkiteClient, type Build } from '#pipeline-utils';

const SMOKE_TESTS_PIPELINE_SLUG = 'fleet-smoke-tests';
const BUILD_SEARCH_WINDOW_DAYS = 7;
const DEFAULT_CONSECUTIVE_FAILURES_THRESHOLD = 3;
const DRY_RUN = !!process.env.DRY_RUN?.match(/(1|true)/i);

const SCHEDULED_BUILDS_MESSAGE_PREFIX = 'Scheduled QA Smoke Tests';
const QUALITY_GATE_BUILDS_MESSAGE_SUFFIX = '(triggered by pipeline.tests-qa.yaml)';
// Slightly longer than the hourly schedule of the notify pipeline, so each failed build alerts once.
const QUALITY_GATE_FAILURE_LOOKBACK_MS = 65 * 60 * 1000;

function getThreshold(): number {
  const raw = process.env.CONSECUTIVE_FAILURES_THRESHOLD;
  if (raw === undefined) {
    return DEFAULT_CONSECUTIVE_FAILURES_THRESHOLD;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(
      `Invalid CONSECUTIVE_FAILURES_THRESHOLD: "${raw}" — expected a positive integer`
    );
  }
  return Math.floor(parsed);
}

function sendSlackNotification(message: string): void {
  const channel = process.env.SLACK_NOTIFICATIONS_CHANNEL;

  if (
    DRY_RUN ||
    (process.env.ELASTIC_SLACK_NOTIFICATIONS_ENABLED !== 'true' &&
      process.env.KIBANA_SLACK_NOTIFICATIONS_ENABLED !== 'true') ||
    !channel
  ) {
    console.log(`Not sending slack message (DRY_RUN=${DRY_RUN}, channel=${channel}):\n${message}`);
    return;
  }

  if (!process.env.BUILDKITE) {
    console.log(`Not running in Buildkite, not sending slack message:\n${message}`);
    return;
  }

  const notifyYaml = [
    'steps:',
    '  - label: ":slack: Fleet Smoke Tests Failure Alert"',
    `    command: "echo 'Fleet smoke tests failure alert sent to Slack'"`,
    '    agents:',
    '      image: family/kibana-minimal-ubuntu-2604',
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
    fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-smoke-tests-notify-')),
    'notify.yml'
  );
  fs.writeFileSync(notifyFile, notifyYaml);
  execSync(`buildkite-agent pipeline upload "${notifyFile}"`, { stdio: 'inherit' });
}

async function main() {
  const buildkite = new BuildkiteClient();
  const threshold = getThreshold();

  const since = new Date(Date.now() - BUILD_SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const builds = await buildkite.getBuildsAfterDate(SMOKE_TESTS_PIPELINE_SLUG, since, 50);

  const finishedMainBuilds = builds.filter(
    (build) => ['passed', 'failed'].includes(build.state) && build.branch === 'main'
  );

  checkQualityGateFailures(finishedMainBuilds);
  checkConsecutiveFailures(finishedMainBuilds, threshold);
}

function checkQualityGateFailures(builds: Build[]): void {
  const cutoff = Date.now() - QUALITY_GATE_FAILURE_LOOKBACK_MS;
  const recentlyFailed = builds.filter(
    (build) =>
      build.state === 'failed' &&
      build.message?.includes(QUALITY_GATE_BUILDS_MESSAGE_SUFFIX) &&
      new Date(build.finished_at).getTime() >= cutoff
  );

  if (recentlyFailed.length === 0) {
    console.log('No recently failed quality gate build(s)');
    return;
  }

  const buildLinks = recentlyFailed.map((b) => `<${b.web_url}|#${b.number}>`).join(', ');

  const message = [
    `:alert: *fleet-smoke-tests* failed in the Kibana serverless QA quality gate (soft fail, review before promotion).`,
    `Failed builds: ${buildLinks}`,
    `<https://buildkite.com/elastic/${SMOKE_TESTS_PIPELINE_SLUG}|View pipeline>`,
  ].join('\n');

  console.log(`Sending alert:\n${message}`);
  sendSlackNotification(message);
}

function checkConsecutiveFailures(builds: Build[], threshold: number): void {
  const relevantBuilds = builds.filter((build) =>
    build.message?.includes(SCHEDULED_BUILDS_MESSAGE_PREFIX)
  );

  console.log(`${relevantBuilds.length} finished scheduled build(s) found on main`);

  if (relevantBuilds.length === 0) {
    return;
  }

  const recentBuilds = relevantBuilds.slice(0, threshold);
  const allFailed =
    recentBuilds.length === threshold && recentBuilds.every((b) => b.state === 'failed');

  console.log(
    `Last ${recentBuilds.length} build(s): ${recentBuilds
      .map((b) => `#${b.number} (${b.state})`)
      .join(', ')}`
  );

  if (!allFailed) {
    console.log(`No alert needed (not ${threshold} consecutive failures)`);
    return;
  }

  const buildLinks = recentBuilds.map((b) => `<${b.web_url}|#${b.number}>`).join(', ');

  const message = [
    `:alert: *fleet-smoke-tests* has failed ${threshold} times in a row.`,
    `Failed builds: ${buildLinks}`,
    `<https://buildkite.com/elastic/${SMOKE_TESTS_PIPELINE_SLUG}|View pipeline>`,
  ].join('\n');

  console.log(`Sending alert:\n${message}`);
  sendSlackNotification(message);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
