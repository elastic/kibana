/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Checks fleet-smoke-tests for sustained consecutive failures and alerts Slack
// when the last N finished builds all failed.

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { BuildkiteClient } from '#pipeline-utils';

const SMOKE_TESTS_PIPELINE_SLUG = 'fleet-smoke-tests';
const BUILD_SEARCH_WINDOW_DAYS = 7;
const DEFAULT_CONSECUTIVE_FAILURES_THRESHOLD = 3;
const DRY_RUN = !!process.env.DRY_RUN?.match(/(1|true)/i);

const SCHEDULED_BUILDS_MESSAGE_PREFIX = 'Scheduled QA Smoke Tests';

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
    '  - label: ":slack: Fleet Smoke Tests Failure Alert"',
    `    command: "echo 'Fleet smoke tests failure alert sent to Slack'"`,
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

  const relevantBuilds = builds.filter(
    (build) =>
      ['passed', 'failed'].includes(build.state) &&
      build.branch === 'main' &&
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

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
