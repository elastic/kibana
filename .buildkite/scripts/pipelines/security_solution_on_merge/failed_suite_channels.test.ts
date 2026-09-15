/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

import { parse as parseYaml } from 'yaml';

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

const NOTIFY_STEP_KEY = 'notify_owning_teams';

interface PipelineStep {
  label?: string;
  key?: string;
  command?: string;
}

/**
 * Suite steps from the pipeline, selected by shape rather than by scraping text,
 * so quoting style or formatting changes cannot silently shrink coverage.
 */
const cypressStepsInPipeline = (): PipelineStep[] => {
  const pipeline = parseYaml(readFileSync(PIPELINE_YML, 'utf8')) as { steps: PipelineStep[] };

  return pipeline.steps.filter(
    (step) =>
      typeof step.label === 'string' &&
      typeof step.command === 'string' &&
      step.key !== NOTIFY_STEP_KEY
  );
};

interface CodeownersEntry {
  path: string;
  owners: string[];
}

const trackedFileCache = new Map<string, string[]>();

const trackedFilesUnder = (specDir: string): string[] => {
  const cached = trackedFileCache.get(specDir);
  if (cached) {
    return cached;
  }

  const files = execFileSync('git', ['ls-files', '-z', '--', specDir], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);

  trackedFileCache.set(specDir, files);
  return files;
};

const codeownersEntries = (): CodeownersEntry[] =>
  readFileSync(CODEOWNERS, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split(/\s+/))
    .map(([pattern, ...owners]) => ({ path: pattern.replace(/^\/|\/$/g, ''), owners }));

/**
 * Whether a wildcard pattern can reach files inside `specDir`.
 *
 * `*` does not cross `/` in CODEOWNERS, and a `dir/*` rule covers files directly
 * in that directory rather than cascading into subdirectories. So a pattern is
 * only in scope when it can match `specDir` itself or something beneath it.
 */
const patternRegex = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split('/')
      .map((segment) =>
        segment === '**'
          ? '\u0000'
          : segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
      )
      .join('/')
      .replace(/\u0000\//g, '(?:.*/)?')
      .replace(/\u0000/g, '.*')}$`
  );

/**
 * Whether a wildcard rule owns files that actually exist inside `specDir`.
 *
 * Matching tracked paths rather than hypothetical ones keeps this honest in both
 * directions: `*` not crossing `/` falls out for free, and a pattern is only
 * flagged when it really does claim a file in the suite.
 */
const wildcardReaches = (pattern: string, specDir: string): boolean => {
  const regex = patternRegex(pattern);
  return trackedFilesUnder(specDir).some((file) => regex.test(file));
};

/**
 * CODEOWNERS entries at or below `specDir`, plus the nearest ancestor entry.
 *
 * Only handles literal paths. Wildcard rules that could reach a suite are
 * rejected by their own test rather than silently skipped here, so this stays a
 * drift check instead of a partial reimplementation of GitHub's matcher.
 */
const expectedOwnersFor = (specDir: string): string[] => {
  const entries = codeownersEntries().filter((entry) => !entry.path.includes('*'));

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
    const steps = cypressStepsInPipeline();

    // Guards against the selector silently matching nothing if the pipeline is restructured.
    expect(steps.length).toBeGreaterThanOrEqual(26);
    for (const { label } of steps) {
      expect(findSuiteForStepLabel(label!)).toBeDefined();
      expect(getChannelForStepLabel(label!)).not.toBe(getFallbackSlackChannel());
    }
  });

  it('does not let a new suite inherit a channel by prefix', () => {
    // A variant label must surface as unmapped so someone adds the mapping,
    // rather than quietly paging the wrong team.
    expect(findSuiteForStepLabel('Osquery Cypress Tests - New Variant')).toBeUndefined();
    expect(getChannelForStepLabel('Osquery Cypress Tests - New Variant')).toBe(
      getFallbackSlackChannel()
    );
  });

  it('still matches sharded job names', () => {
    expect(findSuiteForStepLabel('Osquery Cypress Tests / 3 / 5')?.label).toBe(
      'Osquery Cypress Tests'
    );
    expect(findSuiteForStepLabel('Osquery Cypress Tests (3/5)')?.label).toBe(
      'Osquery Cypress Tests'
    );
  });

  it('selects the suite steps and excludes the notifier', () => {
    const labels = cypressStepsInPipeline().map((step) => step.label);

    expect(labels).toContain('Defend Workflows Cypress Tests');
    expect(labels.every((label) => label?.includes('Cypress Tests'))).toBe(true);
    expect(labels).not.toContain(':slack: Notify owning teams of Security on-merge failures');
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

describe('CODEOWNERS wildcard rules', () => {
  it('has no wildcard rule reaching into a suite tree', () => {
    // expectedOwnersFor only understands literal paths. Rather than let a
    // wildcard rule be skipped and the drift check pass green, fail here so
    // whoever adds it reconciles the mapping by hand.
    const offenders = codeownersEntries()
      .filter((entry) => entry.path.includes('*'))
      .flatMap((entry) =>
        getSuitesConfig()
          .suites.filter((suite) => wildcardReaches(entry.path, suite.specDir))
          .map((suite) => `${entry.path} -> ${suite.label}`)
      );

    expect(offenders).toEqual([]);
  });

  it('scopes wildcards the way CODEOWNERS does', () => {
    const specDir = 'x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/explore';
    const cypressRoot = 'x-pack/solutions/security/test/security_solution_cypress/cypress';

    expect(trackedFilesUnder(specDir).length).toBeGreaterThan(0);

    // `dir/*` owns files directly in dir, so it cannot reach two levels down.
    expect(wildcardReaches(`${cypressRoot}/*`, specDir)).toBe(false);
    expect(wildcardReaches(`${cypressRoot}/e2e/*`, specDir)).toBe(false);

    // `**` spans directories, and a `*` standing in for the suite directory reaches it.
    expect(wildcardReaches(`${cypressRoot}/**`, specDir)).toBe(true);
    expect(wildcardReaches(`${cypressRoot}/e2e/*/**`, specDir)).toBe(true);
    // Every spec sits in a subdirectory of the suite, so a rule for files
    // directly inside it owns nothing, while one a level deeper owns them all.
    expect(wildcardReaches(`${specDir}/*`, specDir)).toBe(false);
    expect(wildcardReaches(`${specDir}/*/*`, specDir)).toBe(true);

    // Only claims paths that exist, so an unrelated tree is not flagged.
    expect(wildcardReaches('x-pack/solutions/**/test/serverless/**/fleet', specDir)).toBe(false);
  });
});

describe('notifier step', () => {
  const notifierStep = () => {
    const pipeline = parseYaml(readFileSync(PIPELINE_YML, 'utf8')) as {
      steps: Array<
        PipelineStep & {
          soft_fail?: boolean;
          retry?: { automatic: Array<{ exit_status: string | number; limit: number }> };
        }
      >;
    };
    return pipeline.steps.find((step) => step.key === NOTIFY_STEP_KEY);
  };

  it('retries only on agent loss', () => {
    // Re-running the script on an ordinary failure could fan out duplicate Slack
    // messages; -1 means the agent died, usually before the pipeline upload.
    expect(notifierStep()?.retry).toEqual({ automatic: [{ exit_status: '-1', limit: 2 }] });
  });

  it('stays soft_fail so a notifier problem cannot mask the suite results', () => {
    expect(notifierStep()?.soft_fail).toBe(true);
  });
});

describe('pipeline resource definition', () => {
  it('keeps the build-bot Slack notifier disabled', () => {
    const yaml = readFileSync(RESOURCE_YML, 'utf8');
    expect(yaml).toMatch(/KIBANA_SLACK_NOTIFICATIONS_ENABLED:\s*'false'/);
  });
});
