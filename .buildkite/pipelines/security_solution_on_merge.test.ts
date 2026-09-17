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

/**
 * Which team owns which suite, keyed on the domain in the step label.
 *
 * Encodes the routing contract rather than a flat allowlist, so reassigning a
 * suite to a different team's channel fails even though that channel is valid.
 */
const DOMAIN_CHANNELS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Detection Engine|Rule Management|Exceptions/, '#security-detection-engineering-team'],
  [/Entity Analytics/, '#security-entity-analytics-alerts'],
  [/Explore|Investigations|AI Assistant/, '#security-threat-hunting'],
  [/Osquery|Defend Workflows/, '#security-defend-workflows'],
];

const expectedChannel = (label: string): string | undefined => {
  const matched = new Set(
    DOMAIN_CHANNELS.filter(([pattern]) => pattern.test(label)).map(([, channel]) => channel)
  );

  // Ambiguity means the contract is undefined for this label, not that either is fine.
  return matched.size === 1 ? [...matched][0] : undefined;
};

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

  it('routes every suite to its owning team', () => {
    const misrouted = suiteSteps().flatMap((step) =>
      (step.notify ?? []).flatMap((entry) =>
        entry.slack.channels
          .filter((channel) => channel !== expectedChannel(step.label!))
          .map((channel) => `${step.label} -> ${channel}`)
      )
    );

    expect(misrouted).toEqual([]);
  });

  it('has an unambiguous owning team for every suite', () => {
    // A suite in a new domain must get an explicit rule rather than inheriting one.
    const unmapped = suiteSteps()
      .filter((step) => expectedChannel(step.label!) === undefined)
      .map((step) => step.label);

    expect(unmapped).toEqual([]);
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
