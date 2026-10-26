/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getPlaywrightLimitGrepInvert,
  getPlaywrightLimitOptions,
  getPlaywrightTagsFor,
  tags,
} from './tags';

describe('getPlaywrightTagsFor', () => {
  it('returns tags for stateful classic with location "all"', () => {
    const result = getPlaywrightTagsFor('stateful', 'classic', 'all');
    expect(result).toContain('@local-stateful-classic');
    expect(result).toContain('@cloud-stateful-classic');
    expect(result).toHaveLength(2);
  });

  it('returns tags for stateful classic with location "local"', () => {
    const result = getPlaywrightTagsFor('stateful', 'classic', 'local');
    expect(result).toEqual(['@local-stateful-classic']);
  });

  it('returns tags for serverless search with location "cloud"', () => {
    const result = getPlaywrightTagsFor('serverless', 'search', 'cloud');
    expect(result).toEqual(['@cloud-serverless-search']);
  });

  it('defaults location to "all" when omitted', () => {
    const result = getPlaywrightTagsFor('stateful', 'search');
    expect(result).toContain('@local-stateful-search');
    expect(result).toContain('@cloud-stateful-search');
  });

  it('returns empty array for domain/arch combo with no targets', () => {
    const result = getPlaywrightTagsFor('stateful', 'workplaceai', 'all');
    expect(result).toEqual([]);
  });
});

describe('tags', () => {
  describe('stateful', () => {
    it('classic includes local and cloud tags', () => {
      expect(tags.stateful.classic).toContain('@local-stateful-classic');
      expect(tags.stateful.classic).toContain('@cloud-stateful-classic');
    });

    it('all aggregates stateful types', () => {
      expect(tags.stateful.all.length).toBeGreaterThan(0);
      expect(tags.stateful.all).toEqual(
        expect.arrayContaining([
          ...tags.stateful.classic,
          ...tags.stateful.search,
          ...tags.stateful.observability,
          ...tags.stateful.security,
        ])
      );
    });
  });

  describe('serverless', () => {
    it('search includes local and cloud tags', () => {
      expect(tags.serverless.search).toContain('@local-serverless-search');
      expect(tags.serverless.search).toContain('@cloud-serverless-search');
    });

    it('observability.all aggregates complete and logs_essentials', () => {
      expect(tags.serverless.observability.all).toEqual(
        expect.arrayContaining([
          ...tags.serverless.observability.complete,
          ...tags.serverless.observability.logs_essentials,
        ])
      );
    });

    it('security.all aggregates complete, essentials, and ease', () => {
      expect(tags.serverless.security.all).toEqual(
        expect.arrayContaining([
          ...tags.serverless.security.complete,
          ...tags.serverless.security.essentials,
          ...tags.serverless.security.ease,
        ])
      );
    });

    it('all includes search, observability, security, and workplaceai', () => {
      expect(tags.serverless.all.length).toBeGreaterThan(0);
      expect(tags.serverless.all).toEqual(
        expect.arrayContaining([
          ...tags.serverless.search,
          ...tags.serverless.observability.all,
          ...tags.serverless.security.all,
          ...tags.serverless.workplaceai,
        ])
      );
    });
  });

  describe('deploymentAgnostic', () => {
    it('includes stateful.all and selected serverless types', () => {
      expect(tags.deploymentAgnostic).toEqual(
        expect.arrayContaining([
          ...tags.stateful.all,
          ...tags.serverless.search,
          ...tags.serverless.observability.complete,
          ...tags.serverless.security.complete,
        ])
      );
    });

    it('every tag starts with @', () => {
      tags.deploymentAgnostic.forEach((tag) => {
        expect(tag.startsWith('@')).toBe(true);
      });
    });
  });

  describe('performance', () => {
    it('contains perf tag', () => {
      expect(tags.performance).toEqual(['@perf']);
    });
  });

  describe('limit', () => {
    it('exposes limit tags in the @limit/<selection-method>-<target-attr> format', () => {
      expect(tags.limit.only.fips).toBe('@limit/only-fips');
      expect(tags.limit.except.fips).toBe('@limit/except-fips');
    });

    it('never overlaps with test target tags', () => {
      expect(tags.deploymentAgnostic).not.toContain(tags.limit.only.fips);
      expect(tags.deploymentAgnostic).not.toContain(tags.limit.except.fips);
    });
  });
});

describe('getPlaywrightLimitGrepInvert', () => {
  it('excludes only-fips tests when no attributes are declared', () => {
    const pattern = getPlaywrightLimitGrepInvert([])!;

    expect(pattern.test('a test @local-stateful-classic @limit/only-fips')).toBe(true);
    expect(pattern.test('a test @local-stateful-classic @limit/except-fips')).toBe(false);
    expect(pattern.test('a test @local-stateful-classic')).toBe(false);
  });

  it('excludes except-fips tests when fips is declared', () => {
    const pattern = getPlaywrightLimitGrepInvert(['fips'])!;

    expect(pattern.test('a test @local-stateful-classic @limit/except-fips')).toBe(true);
    expect(pattern.test('a test @local-stateful-classic @limit/only-fips')).toBe(false);
    expect(pattern.test('a test @local-stateful-classic')).toBe(false);
  });

  it('does not match tags that merely extend an unsatisfied tag', () => {
    const pattern = getPlaywrightLimitGrepInvert([])!;

    expect(pattern.test('a test @local-stateful-classic @limit/only-fips140')).toBe(false);
    expect(pattern.test('a test @limit/only-fips140 @local-stateful-classic')).toBe(false);
  });

  it('matches an unsatisfied tag in any tag position', () => {
    const pattern = getPlaywrightLimitGrepInvert([])!;

    expect(pattern.test('a test @limit/only-fips @local-stateful-classic')).toBe(true);
  });
});

describe('getPlaywrightLimitOptions', () => {
  it('carries the limit pattern as a grepInvert option', () => {
    expect(getPlaywrightLimitOptions([])).toEqual({
      grepInvert: getPlaywrightLimitGrepInvert([])!.source,
    });
    expect(getPlaywrightLimitOptions(['fips'])).toEqual({
      grepInvert: getPlaywrightLimitGrepInvert(['fips'])!.source,
    });
  });

  it('produces a string Playwright turns back into the same pattern', () => {
    const { grepInvert } = getPlaywrightLimitOptions([]);
    const pattern = new RegExp(grepInvert!, 'gi');

    expect(pattern.test('a test @local-stateful-classic @limit/only-fips')).toBe(true);
    pattern.lastIndex = 0;
    expect(pattern.test('a test @local-stateful-classic @limit/except-fips')).toBe(false);
  });
});
