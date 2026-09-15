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

import {
  DEFAULT_FALLBACK_SLACK_CHANNEL,
  FALLBACK_SLACK_CHANNEL_ENV_VAR,
  findSuiteForStepLabel,
  getChannelForStepLabel,
  getFallbackSlackChannel,
  getSuitesConfig,
  readSuitesConfig,
  resolveSuitesConfigPath,
  setSuitesConfig,
} from './failed_suite_channels.ts';

const REPO_ROOT = join(__dirname, '../../../..');
const PIPELINE_YML = join(REPO_ROOT, '.buildkite/pipelines/security_solution_on_merge.yml');
const RESOURCE_YML = join(
  REPO_ROOT,
  '.buildkite/pipeline-resource-definitions/kibana-security-solution-on-merge.yml'
);
const CODEOWNERS = join(REPO_ROOT, '.github/CODEOWNERS');

const cypressLabelsInPipeline = (): string[] => {
  const yaml = readFileSync(PIPELINE_YML, 'utf8');
  const labels = [...yaml.matchAll(/^\s+label: '([^']+)'/gm)].map((match) => match[1]);
  return labels.filter((label) => !label.includes('Notify owning teams'));
};

/**
 * CODEOWNERS entries at or below `specDir`, plus the nearest ancestor entry.
 *
 * Deliberately ignores wildcard patterns: this is here to catch ownership drift
 * inside a suite tree, not to reimplement GitHub's matcher.
 */
const expectedOwnersFor = (specDir: string): string[] => {
  const entries = readFileSync(CODEOWNERS, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split(/\s+/))
    .filter(([pattern]) => !pattern.includes('*'))
    .map(([pattern, ...owners]) => ({ path: pattern.replace(/^\/|\/$/g, ''), owners }));

  const nested = entries.filter(
    (entry) => entry.path === specDir || entry.path.startsWith(`${specDir}/`)
  );

  const ancestors = entries.filter((entry) => specDir.startsWith(`${entry.path}/`));
  // Last match wins in CODEOWNERS; among ancestors the longest path is the most specific.
  const longest = Math.max(0, ...ancestors.map((entry) => entry.path.length));
  const nearestAncestor = ancestors.filter((entry) => entry.path.length === longest).pop();

  const owners = new Set<string>();
  for (const entry of nested) {
    entry.owners.forEach((owner) => owners.add(owner));
  }
  if (nested.length === 0 && nearestAncestor) {
    nearestAncestor.owners.forEach((owner) => owners.add(owner));
  }

  return [...owners].sort();
};

describe('suites config', () => {
  it('resolves from the repo root and from .buildkite', () => {
    expect(resolveSuitesConfigPath(REPO_ROOT)).toBe(
      join(REPO_ROOT, '.buildkite/pipelines/security_solution_on_merge.suites.json')
    );
    expect(resolveSuitesConfigPath(join(REPO_ROOT, '.buildkite'))).toBe(
      resolveSuitesConfigPath(REPO_ROOT)
    );
  });

  it('rejects a config without a fallback channel', () => {
    expect(() => readSuitesConfig(PIPELINE_YML)).toThrow();
  });

  it('routes every suite to a real channel', () => {
    for (const suite of getSuitesConfig().suites) {
      expect(suite.slackChannel).toMatch(/^#[a-z0-9-]+$/);
      expect(suite.owners.length).toBeGreaterThan(0);
    }
  });

  it('does not use the archived Rule Management channel', () => {
    expect(getChannelForStepLabel('Rule Management - Security Solution Cypress Tests')).not.toBe(
      '#security-detection-rule-management'
    );
  });
});

describe('getChannelForStepLabel', () => {
  it('maps every Cypress step label in the pipeline YAML', () => {
    const labels = cypressLabelsInPipeline();

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(findSuiteForStepLabel(label)).toBeDefined();
      expect(getChannelForStepLabel(label)).not.toBe(getFallbackSlackChannel());
    }
  });

  it('matches jobs whose names carry Buildkite shard suffixes', () => {
    expect(getChannelForStepLabel('Explore - Security Solution Cypress Tests / 3 / 5')).toBe(
      '#security-threat-hunting'
    );
  });

  it('prefers the longest matching label so prefixes do not collide', () => {
    expect(findSuiteForStepLabel('Osquery Cypress Tests on Serverless')?.label).toBe(
      'Osquery Cypress Tests on Serverless'
    );
    expect(findSuiteForStepLabel('Osquery Cypress Tests')?.label).toBe('Osquery Cypress Tests');
  });

  it('falls back for unrecognized steps', () => {
    expect(findSuiteForStepLabel('Some new Security Cypress Tests')).toBeUndefined();
    expect(getChannelForStepLabel('Some new Security Cypress Tests')).toBe(
      getFallbackSlackChannel()
    );
  });
});

describe('getFallbackSlackChannel', () => {
  const original = process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR];
    } else {
      process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR] = original;
    }
    setSuitesConfig(undefined);
  });

  it('uses the config value when the env var is unset', () => {
    delete process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR];
    expect(getFallbackSlackChannel()).toBe(getSuitesConfig().fallbackSlackChannel);
  });

  it('prefers the pipeline env override', () => {
    process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR] = '#some-other-channel';
    expect(getFallbackSlackChannel()).toBe('#some-other-channel');
  });

  it('ignores a blank override', () => {
    process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR] = '   ';
    expect(getFallbackSlackChannel()).toBe(getSuitesConfig().fallbackSlackChannel);
  });

  it('matches the channel the pipeline resource definition sets', () => {
    const yaml = readFileSync(RESOURCE_YML, 'utf8');
    expect(yaml).toContain(
      `${FALLBACK_SLACK_CHANNEL_ENV_VAR}: '${getSuitesConfig().fallbackSlackChannel}'`
    );
    expect(getSuitesConfig().fallbackSlackChannel).toBe(DEFAULT_FALLBACK_SLACK_CHANNEL);
  });
});

describe('CODEOWNERS agreement', () => {
  it.each(
    [...new Map(getSuitesConfig().suites.map((suite) => [suite.specDir, suite])).values()].map(
      (suite) => [suite.specDir, suite.owners] as const
    )
  )('declares the CODEOWNERS owners for %s', (specDir, owners) => {
    expect([...owners].sort()).toEqual(expectedOwnersFor(specDir));
  });

  it('keeps suites sharing a specDir on the same channel and owners', () => {
    const bySpecDir = new Map<string, { slackChannel: string; owners: string[] }>();

    for (const suite of getSuitesConfig().suites) {
      const existing = bySpecDir.get(suite.specDir);
      if (existing) {
        expect(suite.slackChannel).toBe(existing.slackChannel);
        expect(suite.owners).toEqual(existing.owners);
      } else {
        bySpecDir.set(suite.specDir, suite);
      }
    }
  });
});

describe('pipeline resource definition', () => {
  it('keeps the build-bot Slack notifier disabled', () => {
    const yaml = readFileSync(RESOURCE_YML, 'utf8');
    expect(yaml).toMatch(/KIBANA_SLACK_NOTIFICATIONS_ENABLED:\s*'false'/);
  });
});
