/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { parse as parseYaml } from 'yaml';

/**
 * Guards owning-team Slack routing, which fails silently in Buildkite: a suite
 * with no notify block, or one pointing at a channel that does not exist, is
 * indistinguishable from a green run.
 */

const PIPELINE_YML = join(__dirname, 'security_solution_on_merge.yml');

/** Channels the Buildkite Slack app is known to reach. Adding one is deliberate. */
const ALLOWED_CHANNELS = [
  '#security-defend-workflows',
  '#security-detection-engineering-team',
  '#security-entity-analytics-alerts',
  '#security-threat-hunting',
];

/** Timeouts and agent loss report as `errored`, which is not `hard_failed`. */
const FAILURE_CONDITION = 'step.outcome == "hard_failed" || step.outcome == "errored"';

interface SlackNotify {
  slack: { channels: string[]; message: string };
  if?: string;
}

interface SuiteStep {
  label?: string;
  command?: string;
  notify?: SlackNotify[];
}

/** Suite steps selected by shape so quoting or formatting changes cannot shrink coverage. */
const suiteSteps = (): SuiteStep[] => {
  const pipeline = parseYaml(readFileSync(PIPELINE_YML, 'utf8')) as { steps: SuiteStep[] };

  return pipeline.steps.filter(
    (step) => typeof step.label === 'string' && typeof step.command === 'string'
  );
};

describe('security_solution_on_merge Slack routing', () => {
  it('selects the Cypress suite steps', () => {
    const steps = suiteSteps();

    // A restructure that stops matching suites would otherwise make every
    // assertion below vacuously pass.
    expect(steps.length).toBeGreaterThanOrEqual(26);
    expect(steps.every((step) => step.label?.includes('Cypress Tests'))).toBe(true);
  });

  it('notifies an owning team for every suite', () => {
    const unrouted = suiteSteps()
      .filter((step) => !step.notify?.some((entry) => entry.slack))
      .map((step) => step.label);

    expect(unrouted).toEqual([]);
  });

  it('only routes to channels the Slack app can reach', () => {
    const unknown = suiteSteps().flatMap((step) =>
      (step.notify ?? []).flatMap((entry) =>
        entry.slack.channels
          .filter((channel) => !ALLOWED_CHANNELS.includes(channel))
          .map((channel) => `${step.label} -> ${channel}`)
      )
    );

    expect(unknown).toEqual([]);
  });

  it('alerts on test failures and on timeouts or agent loss', () => {
    const conditions = suiteSteps().flatMap((step) => (step.notify ?? []).map((entry) => entry.if));

    expect(new Set(conditions)).toEqual(new Set([FAILURE_CONDITION]));
  });

  it('names the failing suite and links the build', () => {
    for (const step of suiteSteps()) {
      for (const entry of step.notify ?? []) {
        expect(entry.slack.message).toContain(step.label);
        expect(entry.slack.message).toContain('${BUILDKITE_BUILD_URL}');
      }
    }
  });
});
