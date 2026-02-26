/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectUniqueTags, getServerRunFlagsFromTags, getTestTagsForTarget } from './tag_utils';

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
  it('returns unique tags from tests with passed status and .spec.ts file', () => {
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

  it('ignores tests whose file does not end with .spec.ts', () => {
    const tests = [
      {
        expectedStatus: 'passed',
        location: { file: '/path/to/setup.ts' },
        tags: ['@local-stateful-classic'],
      },
    ];
    expect(collectUniqueTags(tests)).toEqual([]);
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
});

describe('getServerRunFlagsFromTags', () => {
  it('returns empty array for empty input', () => {
    expect(getServerRunFlagsFromTags([])).toEqual([]);
  });

  it('returns server run flags for supported playwright tags', () => {
    const result = getServerRunFlagsFromTags(['@local-stateful-classic']);
    expect(result).toContain('--arch stateful --domain classic');
  });

  it('returns one flag per tag when multiple tags map to same arch/domain', () => {
    const result = getServerRunFlagsFromTags([
      '@local-stateful-classic',
      '@cloud-stateful-classic',
    ]);
    expect(result).toContain('--arch stateful --domain classic');
    expect(result).toHaveLength(2);
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
