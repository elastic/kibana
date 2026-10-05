/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTargetArch, ScoutTargetAttribute, ScoutTargetDomain } from '@kbn/scout-info';
import { ScoutTestTarget, targetAttributes, testLimits, testTargets } from '@kbn/scout-info';
import { tags } from '../playwright/tags';

/**
 * Resolve the test target attributes a run should assume.
 *
 * Attributes are never auto-detected: they come from `--targetAttribute` (repeatable and/or
 * comma-separated) and fall back to the `SCOUT_TARGET_ATTRIBUTES` environment variable.
 */
export const resolveTargetAttributes = (
  rawAttributes: string[] | undefined
): ScoutTargetAttribute[] => {
  const values = (rawAttributes ?? [])
    .flatMap((rawAttribute) => rawAttribute.split(','))
    .map((rawAttribute) => rawAttribute.trim())
    .filter((rawAttribute) => rawAttribute.length > 0);

  if (values.length === 0) {
    return targetAttributes.current();
  }

  return [...new Set(values.map((value) => targetAttributes.fromString(value)))];
};

// Gets test tags for a given target type
export const getTestTagsForTarget = (target: string): string[] => {
  switch (target) {
    case 'local':
      return testTargets.local.map((t) => t.playwrightTag);
    case 'local-stateful-only':
      return testTargets.local.filter((t) => t.arch === 'stateful').map((t) => t.playwrightTag);
    case 'mki':
      return testTargets.cloud.filter((t) => t.arch === 'serverless').map((t) => t.playwrightTag);
    case 'ech':
      return testTargets.cloud.filter((t) => t.arch === 'stateful').map((t) => t.playwrightTag);
    case 'all':
    default:
      return tags.deploymentAgnostic;
  }
};

const isScoutHookFile = (filePath: string | undefined): boolean => {
  return (
    filePath?.endsWith('global.setup.ts') === true ||
    filePath?.endsWith('global.teardown.ts') === true
  );
};

/** Runnable Scout tests, including those registered from a shared factory instead of a `*.spec.ts`. */
export const isScoutTestFile = (test: {
  expectedStatus?: string;
  location?: { file?: string };
}): boolean => {
  return (
    test.expectedStatus === 'passed' &&
    Boolean(test.location?.file) &&
    !isScoutHookFile(test.location?.file)
  );
};

export interface LimitableTest {
  tags?: string[];
  title?: string;
  location?: { file?: string };
}

/**
 * Whether a test may run against a test target carrying the given attributes, i.e. whether
 * its `@limit/<selection-method>-<target-attr>` tags are all satisfied.
 *
 * A malformed limit tag is fatal rather than ignored — silently dropping it would let a
 * limited test run everywhere — so point at the test that carries it.
 */
export const isTestAllowedForTargetAttributes = (
  test: LimitableTest,
  attributes: Iterable<ScoutTargetAttribute>
): boolean => {
  try {
    return testLimits.allow(test.tags ?? [], attributes);
  } catch (e) {
    throw new Error(
      `Invalid Scout test limit tag on test "${test.title ?? '<unknown>'}" ` +
        `in '${test.location?.file ?? '<unknown file>'}': ${
          e instanceof Error ? e.message : String(e)
        }`
    );
  }
};

/**
 * Keeps only the tests that may run against a test target carrying the given attributes.
 */
export const selectTestsForTargetAttributes = <T extends LimitableTest>(
  tests: T[],
  attributes: readonly ScoutTargetAttribute[]
): T[] => tests.filter((test) => isTestAllowedForTargetAttributes(test, attributes));

/**
 * Report misuse of `@limit/*` tags on a manifest test.
 *
 * The `validateTags` fixture applies the same rules, but only to tests that actually run —
 * and a test breaking either rule is filtered out long before that, so the fixture can never
 * see it. Checking the manifest is what makes these rules enforceable.
 */
export const findLimitTagIssues = (test: LimitableTest): string[] => {
  const testTags = test.tags ?? [];
  const limits = testLimits.fromPlaywrightTags(testTags.filter(testLimits.isPlaywrightTag));

  if (limits.length === 0) {
    return [];
  }

  const issues: string[] = [];
  const selectionTags = new Set([
    ...testTargets.all.map((target) => target.playwrightTag),
    ...tags.performance,
  ]);

  if (!testTags.some((tag) => selectionTags.has(tag))) {
    issues.push(
      'carries limit tags but no test target tag, so it would never be selected to run. ' +
        'A limit narrows an existing target selection, it cannot be one.'
    );
  }

  const selectionMethodsByAttribute = new Map<string, Set<string>>();
  for (const limit of limits) {
    const methods = selectionMethodsByAttribute.get(limit.targetAttribute) ?? new Set<string>();
    methods.add(limit.selectionMethod);
    selectionMethodsByAttribute.set(limit.targetAttribute, methods);
  }

  for (const [targetAttribute, methods] of selectionMethodsByAttribute) {
    if (methods.size > 1) {
      issues.push(
        `carries conflicting limit tags for the '${targetAttribute}' target attribute ` +
          `(${[...methods].sort().join(' and ')}), so it would never run.`
      );
    }
  }

  return issues;
};

// Collects unique test target tags from runnable tests (skip global setup/teardown hooks).
// Limit tags are dropped: they narrow a selection rather than being a selection themselves.
export const collectUniqueTags = (
  tests: Array<{ tags?: string[]; expectedStatus?: string; location?: { file?: string } }>
): string[] => {
  const tagSet = new Set<string>();
  for (const test of tests) {
    if (isScoutTestFile(test) && test.tags) {
      for (const testTag of test.tags) {
        if (testLimits.isPlaywrightTag(testTag)) {
          continue;
        }
        tagSet.add(testTag);
      }
    }
  }
  return Array.from(tagSet);
};

// Converts tags to server run flags. The result is deduplicated by (arch, domain) because
// multiple tag aliases (e.g. `@local-stateful-classic` and `@cloud-stateful-classic`) can
// resolve to the same target; consumers iterate the flags to fan out test runs and would
// otherwise execute the same (arch, domain) twice.
export const getServerRunFlagsFromTags = (testTags: string[]): string[] => {
  const supportedArchDomainCombos: [ScoutTargetArch, ScoutTargetDomain][] = [
    ['stateful', 'classic'],
    ['serverless', 'search'],
    ['serverless', 'observability_complete'],
    ['serverless', 'observability_logs_essentials'],
    ['serverless', 'security_complete'],
    // ['serverless', 'security_essentials'],
    // ['serverless', 'security_ease'],
    // ['serverless', 'workplaceai'],
    ['serverless', 'vectordb'],
  ];
  // TODO: Uncomment above to run tests for these targets in CI

  const flags = [...new Set(testTags)]
    .filter((tag) => !testLimits.isPlaywrightTag(tag))
    .map((tag) => ScoutTestTarget.fromPlaywrightTag(tag))
    .filter((target) =>
      supportedArchDomainCombos.some(
        ([arch, domain]) => target.arch === arch && target.domain === domain
      )
    )
    .map((target) => `--arch ${target.arch} --domain ${target.domain}`);

  return [...new Set(flags)];
};
