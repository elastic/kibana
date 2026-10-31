/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getLiquidInstance,
  MAX_PARSE_CACHE_CHARS,
  parseTemplateString,
} from './liquid_parse_cache';

describe('getLiquidInstance', () => {
  it('returns a Liquid engine instance', () => {
    const engine = getLiquidInstance();
    expect(engine).toBeDefined();
    expect(typeof engine.parse).toBe('function');
    expect(typeof engine.renderSync).toBe('function');
  });

  it('returns the same instance on repeated calls (singleton)', () => {
    const first = getLiquidInstance();
    const second = getLiquidInstance();
    expect(first).toBe(second);
  });

  it('registers the json_parse filter', () => {
    const engine = getLiquidInstance();
    // Verify that rendering a template using json_parse works
    const template = engine.parse('{{ val | json_parse }}');
    const result = engine.renderSync(template, { val: '{"a":1}' });
    // json_parse returns a JS object; Liquid toString will render it
    expect(result).toBeDefined();
  });

  it('parses templates using built-in sha256 and hmac_sha256 filters', () => {
    const engine = getLiquidInstance();
    const shaTemplate = engine.parse('{{ val | sha256 }}');
    expect(engine.renderSync(shaTemplate, { val: 'Polyjuice' })).toBe(
      '44ac1d7a2936e30a5de07082fd65d6fe9b1fb658a1a98bfe65bc5959beac5dd0'
    );

    const hmacTemplate = engine.parse('{{ val | hmac_sha256: key }}');
    expect(engine.renderSync(hmacTemplate, { val: 'Polyjuice', key: 'Polina' })).toBe(
      '8e0d5d65cff1242a4af66c8f4a32854fd5fb80edcc8aabe9b302b29c7c71dc20'
    );
  });

  describe('json_parse filter behavior', () => {
    it('parses valid JSON strings', () => {
      const engine = getLiquidInstance();
      const template = engine.parse('{{ val | json_parse | json }}');
      const result = engine.renderSync(template, { val: '{"key":"value"}' });
      expect(JSON.parse(result as string)).toEqual({ key: 'value' });
    });

    it('returns the original value for non-string input', () => {
      const engine = getLiquidInstance();
      const template = engine.parse('{{ val | json_parse }}');
      const result = engine.renderSync(template, { val: 42 });
      expect(result).toBe('42');
    });

    it('returns the original string for invalid JSON', () => {
      const engine = getLiquidInstance();
      const template = engine.parse('{{ val | json_parse }}');
      const result = engine.renderSync(template, { val: 'not json' });
      expect(result).toBe('not json');
    });
  });

  describe('pick filter behavior', () => {
    it('registers pick so a template using it parses and renders (strictFilters)', () => {
      const engine = getLiquidInstance();
      const template = engine.parse('{{ val | pick: fields | json }}');
      const result = engine.renderSync(template, { val: { a: 1, b: 2 }, fields: ['a'] });
      expect(JSON.parse(result as string)).toEqual({ a: 1 });
    });

    it('keeps nested dotted-path fields', () => {
      const engine = getLiquidInstance();
      const template = engine.parse('{{ val | pick: fields | json }}');
      const result = engine.renderSync(template, {
        val: { host: { name: 'h1', ip: '10.0.0.1' } },
        fields: ['host.name'],
      });
      expect(JSON.parse(result as string)).toEqual({ host: { name: 'h1' } });
    });
  });
});

describe('parseTemplateString', () => {
  it('returns parsed templates for a simple string', () => {
    const result = parseTemplateString('hello {{ name }}');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the same reference on cache hit', () => {
    const templateStr = 'cached-template-{{ x }}';
    const first = parseTemplateString(templateStr);
    const second = parseTemplateString(templateStr);
    expect(first).toBe(second);
  });

  it('returns parsed templates for plain text (no liquid expressions)', () => {
    const result = parseTemplateString('just plain text');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns parsed templates for an empty string', () => {
    const result = parseTemplateString('');
    expect(Array.isArray(result)).toBe(true);
  });

  it('caches an empty string', () => {
    expect(parseTemplateString('')).toBe(parseTemplateString(''));
  });

  describe('size-bounded eviction', () => {
    // Distinct per `id`, `length` characters long, and cheap to parse.
    const buildTemplate = (id: string, length: number): string =>
      `${id}-{{ x }}`.padEnd(length, 'x');
    const ENTRY_LENGTH = MAX_PARSE_CACHE_CHARS / 4;

    it('evicts the least recently used entry when the cache exceeds its character budget', () => {
      // First, parse a "canary" template that should be evicted once more than the budget has been added.
      const canaryTemplate = 'eviction-canary-{{ x }}';
      const canaryResult = parseTemplateString(canaryTemplate);

      // Five entries of a quarter of the budget each are more than the budget holds
      for (let i = 0; i < 5; i++) {
        parseTemplateString(buildTemplate(`eviction-test-${i}`, ENTRY_LENGTH));
      }

      // The canary should have been evicted, so a new call should return a fresh parse
      const afterEviction = parseTemplateString(canaryTemplate);
      // It will be deeply equal but NOT the same reference since it was re-parsed
      expect(afterEviction).not.toBe(canaryResult);
      expect(afterEviction).toEqual(canaryResult);
    });

    it('accessing a cached entry promotes it (LRU behavior)', () => {
      const promotedTemplate = 'promoted-{{ z }}';
      const promotedResult = parseTemplateString(promotedTemplate);

      // Add entries but keep accessing the promoted template to keep it alive
      for (let i = 0; i < 2; i++) {
        parseTemplateString(buildTemplate(`lru-fill-${i}`, ENTRY_LENGTH));
      }

      // Access the promoted template to move it to the end (most recently used)
      parseTemplateString(promotedTemplate);

      // Add more entries to fill past the budget
      for (let i = 2; i < 5; i++) {
        parseTemplateString(buildTemplate(`lru-fill-${i}`, ENTRY_LENGTH));
      }

      // The promoted template should still be cached (same reference)
      const afterPromotion = parseTemplateString(promotedTemplate);
      expect(afterPromotion).toBe(promotedResult);
    });

    it('does not retain a template longer than the whole budget', () => {
      const oversized = buildTemplate('oversized', MAX_PARSE_CACHE_CHARS + 1);

      expect(parseTemplateString(oversized)).not.toBe(parseTemplateString(oversized));
    });

    it('keeps every one of more than 64 distinct templates that fit the budget', () => {
      const templates = Array.from({ length: 100 }, (_, i) => buildTemplate(`many-${i}`, 500));
      const parsed = templates.map(parseTemplateString);

      templates.forEach((template, i) => {
        expect(parseTemplateString(template)).toBe(parsed[i]);
      });
    });
  });
});
