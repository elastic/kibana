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
      expect(ctx.assignVars.map((a) => a.name)).toContain('x');
    });

    it('returns capture variable names before offset', () => {
      const template = '{% capture y %}hello{% endcapture %} {{ y }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.captureNames).toContain('y');
    });

    it('does not include assign after offset', () => {
      const template = '{{ a }} {% assign a = 1 %}';
      const ctx = getTemplateLocalContext(template, 6);
      expect(ctx.assignVars.map((a) => a.name)).not.toContain('a');
    });

    it('handles assign with hyphen trim', () => {
      const template = '{%- assign z = 2 -%}{{ z }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.assignVars.map((a) => a.name)).toContain('z');
    });

    it('returns multiple assign/capture names', () => {
      const template = '{% assign a = 1 %}{% capture b %}x{% endcapture %} {{ a }} {{ b }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.assignVars.map((av) => av.name)).toContain('a');
      expect(ctx.captureNames).toContain('b');
    });

    it('returns assignVars with name and rhs for type inference', () => {
      const template = '{% assign x = steps.fetch.outputs.value %} {{ x }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.assignVars).toContainEqual({
        name: 'x',
        rhs: 'steps.fetch.outputs.value',
      });
    });

    it('returns captureNames separately (capture is always string)', () => {
      const template = '{% capture y %}hello{% endcapture %} {{ y }}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.captureNames).toContain('y');
    });
  });

  describe('for-loop scopes', () => {
    it('detects a for-loop scope with body range', () => {
      const template = '{% for item in items %} {{ item }} {% endfor %}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.forLoopScopes).toHaveLength(1);
      expect(ctx.forLoopScopes[0].variableName).toBe('item');
      expect(ctx.forLoopScopes[0].bodyStart).toBeGreaterThan(0);
      expect(ctx.forLoopScopes[0].bodyEnd).toBeGreaterThan(ctx.forLoopScopes[0].bodyStart);
    });

    it('detects nested for-loop scopes with correct spatial containment', () => {
      const template =
        '{% for outer in list %} {% for inner in outer.items %} {{ inner }} {% endfor %} {% endfor %}';
      const ctx = getTemplateLocalContext(template, template.length);
      const outerScope = ctx.forLoopScopes.find((s) => s.variableName === 'outer');
      const innerScope = ctx.forLoopScopes.find((s) => s.variableName === 'inner');
      expect(outerScope).toBeDefined();
      expect(innerScope).toBeDefined();
      expect(innerScope!.bodyStart).toBeGreaterThan(outerScope!.bodyStart);
      expect(innerScope!.bodyEnd).toBeLessThan(outerScope!.bodyEnd);
    });

    it('does not include the built-in forloop object in forLoopScopes', () => {
      const template = '{% for item in items %} {{ forloop.index }} {% endfor %}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.forLoopScopes.map((s) => s.variableName)).not.toContain('forloop');
    });

    it('extracts collectionPath from for-tag', () => {
      const template = '{% for item in steps.fetch.outputs.results %} {{ item.name }} {% endfor %}';
      const ctx = getTemplateLocalContext(template, template.length);
      expect(ctx.forLoopScopes).toHaveLength(1);
      expect(ctx.forLoopScopes[0].variableName).toBe('item');
      expect(ctx.forLoopScopes[0].collectionPath).toBe('steps.fetch.outputs.results');
    });
  });

  describe('forLoopScopesContainingOffset', () => {
    it('returns scopes that contain the given offset', () => {
      const template = '{% for item in items %} {{ item }} {% endfor %} after';
      const ctx = getTemplateLocalContext(template, template.length);
      const bodyOffset = template.indexOf('{{ item }}') + 3;
      const active = forLoopScopesContainingOffset(ctx.forLoopScopes, bodyOffset);
      expect(active).toHaveLength(1);
      expect(active[0].variableName).toBe('item');
    });

    it('returns empty when offset is outside for-loop body', () => {
      const template = '{% for item in items %} {{ item }} {% endfor %} after';
      const ctx = getTemplateLocalContext(template, template.length);
      const afterOffset = template.indexOf('after');
      const active = forLoopScopesContainingOffset(ctx.forLoopScopes, afterOffset);
      expect(active).toHaveLength(0);
    });

    it('returns both scopes for nested for-loops when offset is inside inner', () => {
      const template =
        '{% for outer in list %}{% for inner in outer.items %} {{ inner }} {% endfor %}{% endfor %}';
      const ctx = getTemplateLocalContext(template, template.length);
      const innerBodyOffset = template.indexOf('{{ inner }}') + 3;
      const active = forLoopScopesContainingOffset(ctx.forLoopScopes, innerBodyOffset);
      const names = active.map((s) => s.variableName);
      expect(names).toContain('outer');
      expect(names).toContain('inner');
    });
  });

  describe('parse errors', () => {
    it('returns empty context when template is invalid Liquid', () => {
      const invalid = '{% assign x = %} {{ x }}';
      const ctx = getTemplateLocalContext(invalid, invalid.length);
      expect(ctx.assignVars).toEqual([]);
      expect(ctx.captureNames).toEqual([]);
      expect(ctx.forLoopScopes).toEqual([]);
    });
  });

  describe('templates without tags', () => {
    it('returns empty context for plain output templates', () => {
      const template = '{{ workflow.id }}';
      const ctx = getTemplateLocalContext(template, 0);
      expect(ctx.assignVars).toEqual([]);
      expect(ctx.captureNames).toEqual([]);
      expect(ctx.forLoopScopes).toEqual([]);
    });
  });
});
