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

import {
  filterFinishedMainBuilds,
  findConsecutiveScheduledFailures,
  findQualityGateFailures,
  type CheckWindow,
} from './build_checks.ts';

const SMOKE_TESTS_PIPELINE_SLUG = 'fleet-smoke-tests';
const BUILD_SEARCH_WINDOW_DAYS = 7;
const DEFAULT_CONSECUTIVE_FAILURES_THRESHOLD = 3;
const DRY_RUN = !!process.env.DRY_RUN?.match(/(1|true)/i);
// Used when the previous check of this pipeline can't be found (first run, local run)
const DEFAULT_CHECK_WINDOW_MS = 60 * 60 * 1000;

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

// The window runs from the creation of the previous build of this pipeline to the creation of the
// current one, so consecutive checks tile without gaps or overlaps and a failed build alerts once.
async function getCheckWindow(buildkite: BuildkiteClient): Promise<CheckWindow> {
  const currentSlug = process.env.BUILDKITE_PIPELINE_SLUG;
  const currentNumber = Number(process.env.BUILDKITE_BUILD_NUMBER);

  if (!process.env.BUILDKITE || !currentSlug || !Number.isFinite(currentNumber)) {
    const end = new Date();
    return { start: new Date(end.getTime() - DEFAULT_CHECK_WINDOW_MS), end };
  }

  const end = new Date((await buildkite.getCurrentBuild()).created_at);
  const since = new Date(end.getTime() - BUILD_SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const notifyBuilds = await buildkite.getBuildsAfterDate(currentSlug, since.toISOString(), 50);
  const previousBuild = notifyBuilds.find((build) => build.number < currentNumber);

  return {
    start: previousBuild
      ? new Date(previousBuild.created_at)
      : new Date(end.getTime() - DEFAULT_CHECK_WINDOW_MS),
    end,
  };
}

function alert(lines: string[]): void {
  const message = [
    ...lines,
    `<https://buildkite.com/elastic/${SMOKE_TESTS_PIPELINE_SLUG}|View pipeline>`,
  ].join('\n');

  console.log(`Sending alert:\n${message}`);
  sendSlackNotification(message);
}

const formatBuildLinks = (builds: Build[]) =>
  builds.map((b) => `<${b.web_url}|#${b.number}>`).join(', ');

async function main() {
  const buildkite = new BuildkiteClient();
  const threshold = getThreshold();

  const since = new Date(Date.now() - BUILD_SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const builds = filterFinishedMainBuilds(
    await buildkite.getBuildsAfterDate(SMOKE_TESTS_PIPELINE_SLUG, since, 50)
  );
  console.log(`${builds.length} finished build(s) found on main`);

  const window = await getCheckWindow(buildkite);
  console.log(`Check window: ${window.start.toISOString()} - ${window.end.toISOString()}`);

  const gateFailures = findQualityGateFailures(builds, window);
  if (gateFailures.length > 0) {
    alert([
      `:alert: *fleet-smoke-tests* failed in the Kibana serverless QA quality gate (soft fail, review before promotion).`,
      `Failed builds: ${formatBuildLinks(gateFailures)}`,
    ]);
  } else {
    console.log('No quality gate failures in the check window');
  }

  const consecutiveFailures = findConsecutiveScheduledFailures(builds, threshold);
  if (consecutiveFailures.length > 0) {
    alert([
      `:alert: *fleet-smoke-tests* has failed ${threshold} times in a row.`,
      `Failed builds: ${formatBuildLinks(consecutiveFailures)}`,
    ]);
  } else {
    console.log(`No alert needed (not ${threshold} consecutive failures)`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
