/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  collectUniqueTags,
  findLimitTagIssues,
  getServerRunFlagsFromTags,
  getTestTagsForTarget,
  isScoutTestFile,
  resolveTargetAttributes,
  selectTestsForTargetAttributes,
} from './tag_utils';

describe('getTestTagsForTarget', () => {
  it('returns only @local-* tags for target "local"', () => {
    const result = getTestTagsForTarget('local');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((tag) => expect(tag).toMatch(/^@local-/));
  });

  it('returns only @local-stateful-* tags for target "local-stateful-only"', () => {
    const result = getTestTagsForTarget('local-stateful-only');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((tag) => expect(tag).toMatch(/^@local-stateful-/));
  });

  it('returns only @cloud-serverless-* tags for target "mki"', () => {
    const result = getTestTagsForTarget('mki');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((tag) => expect(tag).toMatch(/^@cloud-serverless-/));
  });

  it('returns only @cloud-stateful-* tags for target "ech"', () => {
    const result = getTestTagsForTarget('ech');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((tag) => expect(tag).toMatch(/^@cloud-stateful-/));
  });

  it('returns tags.deploymentAgnostic for target "all"', () => {
    const result = getTestTagsForTarget('all');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns tags.deploymentAgnostic for unknown target (default)', () => {
    const result = getTestTagsForTarget('unknown');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(getTestTagsForTarget('all'));
  });
});

describe('collectUniqueTags', () => {
  it('returns unique tags from runnable tests', () => {
    const tests = [
      {
        expectedStatus: 'passed',
        location: { file: '/path/to/foo.spec.ts' },
        tags: ['@local-stateful-classic', '@cloud-serverless-search'],
      },
      {
        expectedStatus: 'passed',
        location: { file: '/path/to/bar.spec.ts' },
        tags: ['@local-stateful-classic', '@local-serverless-search'],
      },
    ];
    const result = collectUniqueTags(tests);
    expect(result).toHaveLength(3);
    expect(result).toContain('@local-stateful-classic');
    expect(result).toContain('@cloud-serverless-search');
    expect(result).toContain('@local-serverless-search');
  });

  it('ignores tests without passed expectedStatus', () => {
    const tests = [
      {
        expectedStatus: 'skipped',
        location: { file: '/path/to/foo.spec.ts' },
        tags: ['@local-stateful-classic'],
      },
    ];
    expect(collectUniqueTags(tests)).toEqual([]);
  });

  it('includes tests registered from a shared factory file', () => {
    const tests = [
      {
        expectedStatus: 'passed',
        location: { file: 'test/scout/foo/ui/fixtures/artifact_tabs_suite.ts' },
        tags: ['@local-stateful-classic'],
      },
    ];
    expect(collectUniqueTags(tests)).toEqual(['@local-stateful-classic']);
  });

  it('ignores global setup and teardown hooks', () => {
    const tests = [
      {
        expectedStatus: 'passed',
        location: { file: 'test/scout/foo/ui/parallel_tests/global.setup.ts' },
        tags: ['@local-stateful-classic'],
      },
      {
        expectedStatus: 'passed',
        location: { file: 'test/scout/foo/ui/parallel_tests/global.teardown.ts' },
        tags: ['@local-serverless-security_complete'],
      },
    ];
    expect(collectUniqueTags(tests)).toEqual([]);
    expect(
      isScoutTestFile({
        expectedStatus: 'passed',
        location: { file: 'test/scout/foo/ui/parallel_tests/global.setup.ts' },
      })
    ).toBe(false);
  });

  it('ignores tests without tags', () => {
    const tests = [
      {
        expectedStatus: 'passed',
        location: { file: '/path/to/foo.spec.ts' },
      },
    ];
    expect(collectUniqueTags(tests)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(collectUniqueTags([])).toEqual([]);
  });

  it('drops limit tags, keeping only test target tags', () => {
    const tests = [
      {
        expectedStatus: 'passed',
        location: { file: '/path/to/foo.spec.ts' },
        tags: ['@local-stateful-classic', '@limit/only-fips'],
      },
    ];
    expect(collectUniqueTags(tests)).toEqual(['@local-stateful-classic']);
  });
});

describe('selectTestsForTargetAttributes', () => {
  const unlimited = { tags: ['@local-stateful-classic'] };
  const onlyFips = { tags: ['@local-stateful-classic', '@limit/only-fips'] };
  const exceptFips = { tags: ['@local-stateful-classic', '@limit/except-fips'] };

  it('keeps unlimited and except-fips tests when no attributes are declared', () => {
    expect(selectTestsForTargetAttributes([unlimited, onlyFips, exceptFips], [])).toEqual([
      unlimited,
      exceptFips,
    ]);
  });

  it('keeps unlimited and only-fips tests when fips is declared', () => {
    expect(selectTestsForTargetAttributes([unlimited, onlyFips, exceptFips], ['fips'])).toEqual([
      unlimited,
      onlyFips,
    ]);
  });

  it('treats tests without tags as unlimited', () => {
    const untagged = {};
    expect(selectTestsForTargetAttributes([untagged], ['fips'])).toEqual([untagged]);
  });

  it('names the offending test when a limit tag is malformed', () => {
    const malformed = {
      title: 'does a thing',
      location: { file: 'test/scout/foo/ui/tests/foo.spec.ts' },
      tags: ['@local-stateful-classic', '@limit/onlyfips'],
    };

    expect(() => selectTestsForTargetAttributes([malformed], [])).toThrow(
      /Invalid Scout test limit tag on test "does a thing" in 'test\/scout\/foo\/ui\/tests\/foo.spec.ts'/
    );
  });
});

describe('findLimitTagIssues', () => {
  it('accepts a limited test that also carries a test target tag', () => {
    expect(findLimitTagIssues({ tags: ['@local-stateful-classic', '@limit/only-fips'] })).toEqual(
      []
    );
  });

  it('accepts a limited performance test', () => {
    expect(findLimitTagIssues({ tags: ['@perf', '@limit/only-fips'] })).toEqual([]);
  });

  it('ignores tests that carry no limit tags', () => {
    expect(findLimitTagIssues({ tags: ['@local-stateful-classic'] })).toEqual([]);
    expect(findLimitTagIssues({})).toEqual([]);
  });

  it('rejects a test tagged with limits alone', () => {
    expect(findLimitTagIssues({ tags: ['@limit/only-fips'] })).toEqual([
      expect.stringContaining('no test target tag'),
    ]);
  });

  it('rejects conflicting limits for the same attribute', () => {
    expect(
      findLimitTagIssues({
        tags: ['@local-stateful-classic', '@limit/only-fips', '@limit/except-fips'],
      })
    ).toEqual([expect.stringContaining("conflicting limit tags for the 'fips'")]);
  });

  it('reports every issue at once', () => {
    expect(findLimitTagIssues({ tags: ['@limit/only-fips', '@limit/except-fips'] })).toHaveLength(
      2
    );
  });
});

describe('resolveTargetAttributes', () => {
  const originalTargetAttributes = process.env.SCOUT_TARGET_ATTRIBUTES;

  afterEach(() => {
    if (originalTargetAttributes === undefined) {
      delete process.env.SCOUT_TARGET_ATTRIBUTES;
    } else {
      process.env.SCOUT_TARGET_ATTRIBUTES = originalTargetAttributes;
    }
  });

  it('parses repeated and comma-separated flag values', () => {
    expect(resolveTargetAttributes(['fips'])).toEqual(['fips']);
    expect(resolveTargetAttributes(['fips', 'fips'])).toEqual(['fips']);
    expect(resolveTargetAttributes([' fips , fips '])).toEqual(['fips']);
  });

  it('falls back to SCOUT_TARGET_ATTRIBUTES when no flag is given', () => {
    process.env.SCOUT_TARGET_ATTRIBUTES = 'fips';

    expect(resolveTargetAttributes(undefined)).toEqual(['fips']);
    expect(resolveTargetAttributes([])).toEqual(['fips']);
  });

  it('lets flag values win over the environment', () => {
    // A bogus env value proves precedence: if the environment were consulted at all when a
    // flag is present, resolution would throw instead of returning the flag value.
    process.env.SCOUT_TARGET_ATTRIBUTES = 'quantum';

    expect(resolveTargetAttributes(['fips'])).toEqual(['fips']);
  });

  it('returns no attributes when neither flag nor environment declares any', () => {
    delete process.env.SCOUT_TARGET_ATTRIBUTES;

    expect(resolveTargetAttributes(undefined)).toEqual([]);
  });

  it('throws on unknown attributes', () => {
    expect(() => resolveTargetAttributes(['quantum'])).toThrow(
      /Failed to parse the string 'quantum' as a Scout test target attribute/
    );
  });
});

describe('getServerRunFlagsFromTags', () => {
  it('returns empty array for empty input', () => {
    expect(getServerRunFlagsFromTags([])).toEqual([]);
  });

  it('returns server run flags for supported playwright tags', () => {
    const result = getServerRunFlagsFromTags(['@local-stateful-classic']);
    expect(result).toContain('--arch stateful --domain classic');
  });

  it('dedupes flags when multiple tag aliases map to the same arch/domain', () => {
    const result = getServerRunFlagsFromTags([
      '@local-stateful-classic',
      '@cloud-stateful-classic',
    ]);
    expect(result).toEqual(['--arch stateful --domain classic']);
  });

  it('returns only flags for supported arch/domain combinations', () => {
    const result = getServerRunFlagsFromTags([
      '@local-stateful-classic',
      '@local-serverless-search',
    ]);
    expect(result).toContain('--arch stateful --domain classic');
    expect(result).toContain('--arch serverless --domain search');
  });
});
