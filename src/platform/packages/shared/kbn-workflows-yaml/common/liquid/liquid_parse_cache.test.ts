/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLiquidInstance, parseTemplateString } from './liquid_parse_cache';

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

  describe('LRU eviction', () => {
    it('evicts the least recently used entry when cache exceeds max size', () => {
      // The MAX_PARSE_CACHE_SIZE is 64. We fill the cache beyond that to trigger eviction.
      // First, parse a "canary" template that should be evicted once we add 64+ more entries.
      const canaryTemplate = 'eviction-canary-{{ x }}';
      const canaryResult = parseTemplateString(canaryTemplate);

      // Add enough unique entries to push the canary out
      for (let i = 0; i < 65; i++) {
        parseTemplateString(`eviction-test-${i}-{{ y }}`);
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
      for (let i = 0; i < 40; i++) {
        parseTemplateString(`lru-fill-${i}-{{ w }}`);
      }

      // Access the promoted template to move it to the end (most recently used)
      parseTemplateString(promotedTemplate);

      // Add more entries to fill past the limit
      for (let i = 40; i < 80; i++) {
        parseTemplateString(`lru-fill-${i}-{{ w }}`);
      }

      // The promoted template should still be cached (same reference)
      const afterPromotion = parseTemplateString(promotedTemplate);
      expect(afterPromotion).toBe(promotedResult);
    });
  });
});
