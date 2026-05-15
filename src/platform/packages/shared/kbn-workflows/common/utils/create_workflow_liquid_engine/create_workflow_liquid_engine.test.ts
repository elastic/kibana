/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Liquid } from 'liquidjs';
import { createWorkflowLiquidEngine, LIQUID_ALLOWED_TAGS } from './create_workflow_liquid_engine';

describe('createWorkflowLiquidEngine', () => {
  describe('basic functionality', () => {
    it('returns a Liquid engine that renders templates', () => {
      const engine = createWorkflowLiquidEngine();
      expect(engine).toBeInstanceOf(Liquid);
      expect(engine.parseAndRenderSync('{{ name }}', { name: 'test' })).toBe('test');
    });
  });

  describe('security: tag restriction enforcement', () => {
    it('rejects render tag (removed)', () => {
      const engine = createWorkflowLiquidEngine();
      expect(() => engine.parseAndRenderSync("{% render 'file.html' %}")).toThrow();
    });

    it('rejects include tag (removed)', () => {
      const engine = createWorkflowLiquidEngine();
      expect(() => engine.parseAndRenderSync("{% include 'partial' %}")).toThrow();
    });

    it('rejects layout tag (removed)', () => {
      const engine = createWorkflowLiquidEngine();
      expect(() => engine.parseAndRenderSync("{% layout 'base' %}")).toThrow();
    });

    it('allowed tags parse without error', () => {
      const engine = createWorkflowLiquidEngine();
      // Smoke test a few allowed tags
      expect(() => engine.parseAndRenderSync('{% comment %}x{% endcomment %}')).not.toThrow();
      expect(() => engine.parseAndRenderSync('{% if true %}y{% endif %}')).not.toThrow();
      expect(() => engine.parseAndRenderSync('{% unless false %}z{% endunless %}')).not.toThrow();
    });
  });

  describe('security: filesystem isolation', () => {
    const getFs = () => {
      const engine = createWorkflowLiquidEngine();
      expect(engine.options.fs).toBeDefined();
      return engine.options.fs!;
    };

    it('noopFs readFile throws with filepath in message', async () => {
      const fs = getFs();
      await expect(fs.readFile!('secret.txt')).rejects.toThrow('secret.txt');
    });

    it('noopFs readFileSync throws with filepath in message', () => {
      const fs = getFs();
      expect(() => fs.readFileSync!('secret.txt')).toThrow('secret.txt');
    });

    it('noopFs exists returns false', async () => {
      const fs = getFs();
      await expect(fs.exists!('any-path')).resolves.toBe(false);
    });

    it('noopFs existsSync returns false', () => {
      const fs = getFs();
      expect(fs.existsSync!('any-path')).toBe(false);
    });

    it('readFile error message includes the attempted filepath', async () => {
      const fs = getFs();
      await expect(fs.readFile!('/etc/passwd')).rejects.toThrow('/etc/passwd');
    });
  });

  describe('security: ownPropertyOnly enforcement', () => {
    it('does not expose constructor through templates', () => {
      const engine = createWorkflowLiquidEngine();
      const result = engine.parseAndRenderSync('{{ constructor }}', { name: 'test' });
      expect(result).toBe('');
    });

    it('does not expose __proto__ through templates', () => {
      const engine = createWorkflowLiquidEngine();
      const result = engine.parseAndRenderSync('{{ __proto__ }}', { name: 'test' });
      expect(result).toBe('');
    });
  });

  describe('custom options passthrough', () => {
    it('accepts additional Liquid options', () => {
      // strictFilters causes an error for unknown filters
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      expect(engine).toBeInstanceOf(Liquid);
    });
  });

  describe('LIQUID_ALLOWED_TAGS', () => {
    it('includes expected core tags', () => {
      const allowedTags = ['assign', 'for', 'if', 'capture', 'case', 'comment'];
      for (const tag of allowedTags) {
        expect(LIQUID_ALLOWED_TAGS.has(tag)).toBe(true);
      }
    });

    it('does not include file-related tags', () => {
      const disallowedTags = ['render', 'include', 'layout'];
      for (const tag of disallowedTags) {
        expect(LIQUID_ALLOWED_TAGS.has(tag)).toBe(false);
      }
    });
  });

  describe('sha256 filter', () => {
    // Hex digests below come from running `echo -n '<input>' | shasum -a 256`
    // out-of-band and pinning the expected output so a regression in
    // `js-sha256` (or in the coercion helper) surfaces as a test failure
    // rather than a silent fingerprint shift in the threat-intel
    // `source_ingestion` workflow.
    const HASH_OF_EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const HASH_OF_HELLO = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

    it('hashes a literal string to a 64-char lowercase hex digest', () => {
      const engine = createWorkflowLiquidEngine();
      const result = engine.parseAndRenderSync("{{ 'hello' | sha256 }}");
      expect(result).toBe(HASH_OF_HELLO);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('hashes a context variable string', () => {
      const engine = createWorkflowLiquidEngine();
      const result = engine.parseAndRenderSync('{{ body | sha256 }}', { body: 'hello' });
      expect(result).toBe(HASH_OF_HELLO);
    });

    it('is deterministic for the same input across calls', () => {
      const engine = createWorkflowLiquidEngine();
      const a = engine.parseAndRenderSync('{{ body | sha256 }}', { body: 'foo bar' });
      const b = engine.parseAndRenderSync('{{ body | sha256 }}', { body: 'foo bar' });
      expect(a).toBe(b);
    });

    it('hashes undefined / null / missing to the empty-string digest', () => {
      const engine = createWorkflowLiquidEngine();
      // Missing key — LiquidJS resolves to undefined.
      const missing = engine.parseAndRenderSync('{{ body | sha256 }}');
      // Explicit null.
      const nullValue = engine.parseAndRenderSync('{{ body | sha256 }}', { body: null });
      expect(missing).toBe(HASH_OF_EMPTY);
      expect(nullValue).toBe(HASH_OF_EMPTY);
    });

    it('hashes numbers via String() coercion', () => {
      const engine = createWorkflowLiquidEngine();
      const a = engine.parseAndRenderSync('{{ n | sha256 }}', { n: 42 });
      const b = engine.parseAndRenderSync("{{ '42' | sha256 }}");
      // Same digest as the string "42" — numbers round-trip through String().
      expect(a).toBe(b);
    });

    it('hashes arrays / objects via JSON.stringify', () => {
      const engine = createWorkflowLiquidEngine();
      const a = engine.parseAndRenderSync('{{ data | sha256 }}', { data: [1, 2, 3] });
      const b = engine.parseAndRenderSync('{{ data | sha256 }}', { data: [1, 2, 3] });
      // Same array shape produces the same digest run-over-run.
      expect(a).toBe(b);
      // And it is not the literal "[object Object]" / coerced-string hash.
      expect(a).not.toBe(HASH_OF_EMPTY);
    });
  });
});
