/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  forLoopScopesContainingOffset,
  getTemplateLocalContext,
} from './extract_template_local_context';

describe('getTemplateLocalContext', () => {
  describe('assign and capture', () => {
    it('returns assign variable names before offset', () => {
      const template = '{% assign x = 1 %} {{ x }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.assignCaptureNames).toContain('x');
    });

    it('returns capture variable names before offset', () => {
      const template = '{% capture y %}hello{% endcapture %} {{ y }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.assignCaptureNames).toContain('y');
    });

    it('does not include assign after offset', () => {
      const template = '{{ a }} {% assign a = 1 %}';
      const ctx = getTemplateLocalContext(template, 6);
      expect(ctx.assignCaptureNames).not.toContain('a');
    });

    it('handles assign with hyphen trim', () => {
      const template = '{%- assign z = 2 -%}{{ z }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.assignCaptureNames).toContain('z');
    });

    it('returns multiple assign/capture names', () => {
      const template = '{% assign a = 1 %}{% capture b %}x{% endcapture %} {{ a }} {{ b }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.assignCaptureNames).toContain('a');
      expect(ctx.assignCaptureNames).toContain('b');
    });
  });

  describe('for-loop scopes', () => {
    it('returns single for-loop body range', () => {
      const template = '{% for item in items %} {{ item }} {% endfor %}';
      const ctx = getTemplateLocalContext(template, 0);
      expect(ctx.forLoopScopes).toHaveLength(1);
      expect(ctx.forLoopScopes[0].variableName).toBe('item');
      expect(ctx.forLoopScopes[0].bodyStart).toBeGreaterThan(0);
      expect(ctx.forLoopScopes[0].bodyEnd).toBeLessThanOrEqual(template.length);
    });

    it('forLoopScopesContainingOffset filters to scopes containing offset', () => {
      const template = '{% for item in items %} {{ item }} {% endfor %}';
      const ctx = getTemplateLocalContext(template, 0);
      const bodyStart = ctx.forLoopScopes[0].bodyStart;
      const bodyEnd = ctx.forLoopScopes[0].bodyEnd;
      const inside = Math.floor((bodyStart + bodyEnd) / 2);
      const containing = forLoopScopesContainingOffset(ctx.forLoopScopes, inside);
      expect(containing).toHaveLength(1);
      expect(containing[0].variableName).toBe('item');
    });

    it('forLoopScopesContainingOffset returns empty when offset outside loop', () => {
      const template = 'before {% for item in items %} x {% endfor %} after';
      const ctx = getTemplateLocalContext(template, 0);
      const containing = forLoopScopesContainingOffset(ctx.forLoopScopes, 0);
      expect(containing).toHaveLength(0);
    });

    it('handles nested for loops', () => {
      const template =
        '{% for outer in list %} {% for inner in outer.items %} {{ inner }} {% endfor %} {% endfor %}';
      const ctx = getTemplateLocalContext(template, 0);
      expect(ctx.forLoopScopes.length).toBeGreaterThanOrEqual(2);
      const outerScope = ctx.forLoopScopes.find((s) => s.variableName === 'outer');
      const innerScope = ctx.forLoopScopes.find((s) => s.variableName === 'inner');
      expect(outerScope).toBeDefined();
      expect(innerScope).toBeDefined();
      expect(innerScope!.bodyStart).toBeGreaterThan(outerScope!.bodyStart);
      expect(innerScope!.bodyEnd).toBeLessThan(outerScope!.bodyEnd);
    });

    it('extracts collectionPath from for-tag args', () => {
      const template = '{% for item in steps.fetch.outputs.results %} {{ item.name }} {% endfor %}';
      const ctx = getTemplateLocalContext(template, template.indexOf('item.name'));
      expect(ctx.forLoopScopes).toHaveLength(1);
      expect(ctx.forLoopScopes[0].variableName).toBe('item');
      expect(ctx.forLoopScopes[0].collectionPath).toBe('steps.fetch.outputs.results');
    });
  });

  describe('parse errors', () => {
    it('returns empty context when template is invalid Liquid', () => {
      const invalid = '{% assign x = %} {{ x }}';
      const ctx = getTemplateLocalContext(invalid, invalid.length);
      expect(ctx.assignCaptureNames).toEqual([]);
      expect(ctx.forLoopScopes).toEqual([]);
    });
  });
});
