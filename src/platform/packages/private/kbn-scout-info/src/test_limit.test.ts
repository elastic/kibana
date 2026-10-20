/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestLimit, targetAttributes, testLimits } from './test_limit';

describe('ScoutTestLimit', () => {
  it('builds tags in the @limit/<selection-method>-<target-attr> format', () => {
    expect(new ScoutTestLimit('only', 'fips').tag).toBe('limit/only-fips');
    expect(new ScoutTestLimit('only', 'fips').playwrightTag).toBe('@limit/only-fips');
    expect(new ScoutTestLimit('except', 'fips').playwrightTag).toBe('@limit/except-fips');
  });

  it('rejects unknown selection methods and target attributes', () => {
    expect(() => new ScoutTestLimit('unless', 'fips')).toThrow(
      /Scout test limit validation discovered/
    );
    expect(() => new ScoutTestLimit('only', 'quantum')).toThrow(
      /Scout test limit validation discovered/
    );
  });

  it('parses limits from tags', () => {
    const limit = ScoutTestLimit.fromTag('limit/except-fips');

    expect(limit.selectionMethod).toBe('except');
    expect(limit.targetAttribute).toBe('fips');
  });

  it('parses limits from Playwright tags', () => {
    const limit = ScoutTestLimit.fromPlaywrightTag('@limit/only-fips');

    expect(limit.selectionMethod).toBe('only');
    expect(limit.targetAttribute).toBe('fips');
  });

  it('fails to parse malformed tags', () => {
    expect(() => ScoutTestLimit.fromPlaywrightTag('limit/only-fips')).toThrow(
      /expected tag to start with @/
    );
    expect(() => ScoutTestLimit.fromPlaywrightTag('@limit/only')).toThrow(
      /did not match the expected regex pattern/
    );
    expect(() => ScoutTestLimit.fromTag('@local-stateful-classic')).toThrow(
      /did not match the expected regex pattern/
    );
  });

  it('recognizes limit tags without parsing them', () => {
    expect(ScoutTestLimit.isPlaywrightTag('@limit/only-fips')).toBe(true);
    expect(ScoutTestLimit.isPlaywrightTag('@local-stateful-classic')).toBe(false);
    expect(ScoutTestLimit.isPlaywrightTag('@perf')).toBe(false);
  });

  describe('isSatisfiedBy', () => {
    it("satisfies 'only' limits when the attribute is present", () => {
      const limit = new ScoutTestLimit('only', 'fips');

      expect(limit.isSatisfiedBy(['fips'])).toBe(true);
      expect(limit.isSatisfiedBy([])).toBe(false);
    });

    it("satisfies 'except' limits when the attribute is absent", () => {
      const limit = new ScoutTestLimit('except', 'fips');

      expect(limit.isSatisfiedBy([])).toBe(true);
      expect(limit.isSatisfiedBy(['fips'])).toBe(false);
    });
  });
});

describe('testLimits', () => {
  it('exposes every selection method / target attribute combination', () => {
    expect(testLimits.all.map((limit) => limit.playwrightTag)).toEqual([
      '@limit/only-fips',
      '@limit/except-fips',
    ]);
  });

  it('ignores non-limit tags when parsing a tag list', () => {
    const limits = testLimits.fromPlaywrightTags([
      '@local-stateful-classic',
      '@limit/only-fips',
      '@perf',
    ]);

    expect(limits.map((limit) => limit.playwrightTag)).toEqual(['@limit/only-fips']);
  });

  describe('allow', () => {
    it('allows tests without limits regardless of the attributes', () => {
      expect(testLimits.allow(['@local-stateful-classic'], [])).toBe(true);
      expect(testLimits.allow(['@local-stateful-classic'], ['fips'])).toBe(true);
    });

    it('allows only-fips tests exclusively when fips is present', () => {
      const testTags = ['@local-stateful-classic', '@limit/only-fips'];

      expect(testLimits.allow(testTags, ['fips'])).toBe(true);
      expect(testLimits.allow(testTags, [])).toBe(false);
    });

    it('allows except-fips tests exclusively when fips is absent', () => {
      const testTags = ['@local-stateful-classic', '@limit/except-fips'];

      expect(testLimits.allow(testTags, [])).toBe(true);
      expect(testLimits.allow(testTags, ['fips'])).toBe(false);
    });

    it('requires every limit on a test to be satisfied', () => {
      const testTags = ['@local-stateful-classic', '@limit/only-fips', '@limit/except-fips'];

      expect(testLimits.allow(testTags, [])).toBe(false);
      expect(testLimits.allow(testTags, ['fips'])).toBe(false);
    });
  });

  describe('unsatisfiedBy', () => {
    it('reports only-fips as unsatisfied without the fips attribute', () => {
      expect(testLimits.unsatisfiedBy([]).map((limit) => limit.playwrightTag)).toEqual([
        '@limit/only-fips',
      ]);
    });

    it('reports except-fips as unsatisfied with the fips attribute', () => {
      expect(testLimits.unsatisfiedBy(['fips']).map((limit) => limit.playwrightTag)).toEqual([
        '@limit/except-fips',
      ]);
    });
  });
});

describe('targetAttributes', () => {
  const originalTargetAttributes = process.env.SCOUT_TARGET_ATTRIBUTES;

  afterEach(() => {
    if (originalTargetAttributes === undefined) {
      delete process.env.SCOUT_TARGET_ATTRIBUTES;
    } else {
      process.env.SCOUT_TARGET_ATTRIBUTES = originalTargetAttributes;
    }
  });

  it('parses valid attribute strings', () => {
    expect(targetAttributes.fromString('fips')).toBe('fips');
  });

  it('rejects unknown attribute strings', () => {
    expect(() => targetAttributes.fromString('quantum')).toThrow(
      /Failed to parse the string 'quantum' as a Scout test target attribute/
    );
  });

  it('returns no attributes when SCOUT_TARGET_ATTRIBUTES is unset or empty', () => {
    delete process.env.SCOUT_TARGET_ATTRIBUTES;
    expect(targetAttributes.current()).toEqual([]);

    process.env.SCOUT_TARGET_ATTRIBUTES = '  ';
    expect(targetAttributes.current()).toEqual([]);
  });

  it('parses and de-duplicates comma-separated attributes', () => {
    process.env.SCOUT_TARGET_ATTRIBUTES = 'fips, fips';

    expect(targetAttributes.current()).toEqual(['fips']);
  });

  it('throws on an unknown attribute in SCOUT_TARGET_ATTRIBUTES', () => {
    process.env.SCOUT_TARGET_ATTRIBUTES = 'quantum';

    expect(() => targetAttributes.current()).toThrow(
      /Failed to parse the string 'quantum' as a Scout test target attribute/
    );
  });

  describe('fromCommaSeparated', () => {
    it('returns no attributes for nullish or blank input', () => {
      expect(targetAttributes.fromCommaSeparated(undefined)).toEqual([]);
      expect(targetAttributes.fromCommaSeparated(null)).toEqual([]);
      expect(targetAttributes.fromCommaSeparated('')).toEqual([]);
      expect(targetAttributes.fromCommaSeparated(' , ')).toEqual([]);
    });

    it('parses, trims and de-duplicates', () => {
      expect(targetAttributes.fromCommaSeparated(' fips , fips ')).toEqual(['fips']);
    });

    it('throws on unknown attributes', () => {
      expect(() => targetAttributes.fromCommaSeparated('fips,quantum')).toThrow(
        /Failed to parse the string 'quantum' as a Scout test target attribute/
      );
    });
  });

  describe('key', () => {
    it('is empty when there are no attributes', () => {
      expect(targetAttributes.key([])).toBe('');
    });

    it('is independent of order and duplicates', () => {
      expect(targetAttributes.key(['fips', 'fips'])).toBe('fips');
      expect(targetAttributes.key(['fips'])).toBe(targetAttributes.key(new Set(['fips'])));
    });

    it('round-trips through fromCommaSeparated', () => {
      const attributes = targetAttributes.fromCommaSeparated('fips');
      expect(targetAttributes.fromCommaSeparated(targetAttributes.key(attributes))).toEqual(
        attributes
      );
    });
  });
});
