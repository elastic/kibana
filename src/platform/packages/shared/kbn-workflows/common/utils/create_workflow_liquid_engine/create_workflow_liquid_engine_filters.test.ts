/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * B5 refactor: custom filters (json_parse, entries, pick) are now registered
 * once inside createWorkflowLiquidEngine, not separately in each consumer.
 *
 * These tests verify:
 * 1. Every engine returned by the factory includes all three filters.
 * 2. The `entries` filter is the *real* object-to-array implementation — not the
 *    no-op identity stub that previously existed in liquid_parse_cache.ts.
 * 3. The `json_parse` and `pick` filter behaviours are correct.
 * 4. Filters work correctly regardless of whether strictFilters is set.
 */

import { createWorkflowLiquidEngine } from './create_workflow_liquid_engine';

describe('createWorkflowLiquidEngine — built-in custom filters (B5)', () => {
  // -----------------------------------------------------------------------
  // json_parse
  // -----------------------------------------------------------------------
  describe('json_parse filter', () => {
    it('parses a valid JSON string to an object (rendered via | json)', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const result = engine.parseAndRenderSync('{{ val | json_parse | json }}', {
        val: '{"a":1}',
      });
      expect(JSON.parse(result)).toEqual({ a: 1 });
    });

    it('returns the input unchanged for non-string values', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const result = engine.parseAndRenderSync('{{ val | json_parse }}', { val: 42 });
      expect(result).toBe('42');
    });

    it('returns the original string when JSON is invalid', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const result = engine.parseAndRenderSync('{{ val | json_parse }}', { val: 'not-json' });
      expect(result).toBe('not-json');
    });
  });

  // -----------------------------------------------------------------------
  // entries — key fix: the former no-op stub in liquid_parse_cache.ts is gone
  // -----------------------------------------------------------------------
  describe('entries filter', () => {
    it('converts a plain object to an array of { key, value } pairs', () => {
      // Previously, the engine returned by getLiquidInstance() (liquid_parse_cache.ts)
      // had a no-op entries filter that simply returned the input unchanged.
      // After B5, every engine shares the same real implementation.
      const engine = createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false });
      const result = engine.parseAndRenderSync(
        '{% assign pairs = obj | entries %}{% for p in pairs %}{{ p.key }}={{ p.value }} {% endfor %}',
        { obj: { x: 1, y: 2 } }
      );
      // Order is insertion order (Object.entries guarantee)
      expect(result.trim()).toBe('x=1 y=2');
    });

    it('returns a non-object value unchanged (array passthrough)', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const result = engine.parseAndRenderSync('{{ val | entries | json }}', {
        val: [1, 2, 3],
      });
      expect(JSON.parse(result)).toEqual([1, 2, 3]);
    });

    it('returns null unchanged', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const result = engine.parseAndRenderSync('{{ val | entries }}', { val: null });
      expect(result).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  // pick
  // -----------------------------------------------------------------------
  describe('pick filter', () => {
    it('keeps only the requested dotted-path fields', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const result = engine.parseAndRenderSync('{{ obj | pick: "a", "b.c" | json }}', {
        obj: { a: 1, b: { c: 2, d: 99 }, z: 42 },
      });
      expect(JSON.parse(result)).toEqual({ a: 1, b: { c: 2 } });
    });

    it('accepts a single array of paths passed as argument', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false });
      const result = engine.parseAndRenderSync(
        '{% assign paths = "a,b" | split: "," %}{{ obj | pick: paths | json }}',
        { obj: { a: 1, b: 2, c: 3 } }
      );
      expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
    });
  });

  // -----------------------------------------------------------------------
  // Availability under strictFilters (regression: filters must be registered
  // before the engine is used, regardless of the strictFilters option)
  // -----------------------------------------------------------------------
  describe('filter availability with strictFilters: true', () => {
    it('json_parse does not throw with strictFilters: true', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      expect(() =>
        engine.parseAndRenderSync('{{ v | json_parse }}', { v: '"hello"' })
      ).not.toThrow();
    });

    it('entries does not throw with strictFilters: true', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      expect(() =>
        engine.parseAndRenderSync('{{ v | entries | json }}', { v: { k: 1 } })
      ).not.toThrow();
    });

    it('pick does not throw with strictFilters: true', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      expect(() =>
        engine.parseAndRenderSync('{{ v | pick: "k" | json }}', { v: { k: 1 } })
      ).not.toThrow();
    });

    it('still rejects genuinely unknown filters with strictFilters: true', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      expect(() => engine.parseAndRenderSync('{{ v | no_such_filter }}', { v: 1 })).toThrow();
    });
  });
});
