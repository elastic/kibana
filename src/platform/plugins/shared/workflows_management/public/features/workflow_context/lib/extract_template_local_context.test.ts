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

  describe('same-line use-before-declaration edge cases', () => {
    it('excludes assign when variable is used before assign on the same line', () => {
      const template = '{{ x }}{% assign x = 1 %}';
      const varOffset = 0;
      const ctx = getTemplateLocalContext(template, varOffset);
      expect(ctx.assignVars.map((a) => a.name)).not.toContain('x');
    });

    it('includes assign when variable is used after assign on the same line', () => {
      const template = '{% assign x = 1 %}{{ x }}';
      const varOffset = template.indexOf('{{ x }}');
      const ctx = getTemplateLocalContext(template, varOffset);
      expect(ctx.assignVars.map((a) => a.name)).toContain('x');
    });

    it('handles mixed: first variable invalid, second valid on same line', () => {
      const template = '{{ y }}{% assign y = 2 %}{{ y }}';

      const firstVarOffset = 0;
      const ctx1 = getTemplateLocalContext(template, firstVarOffset);
      expect(ctx1.assignVars.map((a) => a.name)).not.toContain('y');

      const secondVarOffset = template.lastIndexOf('{{ y }}');
      const ctx2 = getTemplateLocalContext(template, secondVarOffset);
      expect(ctx2.assignVars.map((a) => a.name)).toContain('y');
    });

    it('handles multiple assigns and variables interleaved on one line', () => {
      const template = '{% assign a = 1 %}{{ a }}{{ b }}{% assign b = 2 %}{{ a }}{{ b }}';

      const aAfterAssign = template.indexOf('{{ a }}');
      const ctx1 = getTemplateLocalContext(template, aAfterAssign);
      expect(ctx1.assignVars.map((v) => v.name)).toContain('a');
      expect(ctx1.assignVars.map((v) => v.name)).not.toContain('b');

      const bBeforeAssign = template.indexOf('{{ b }}');
      const ctx2 = getTemplateLocalContext(template, bBeforeAssign);
      expect(ctx2.assignVars.map((v) => v.name)).toContain('a');
      expect(ctx2.assignVars.map((v) => v.name)).not.toContain('b');

      const bAfterAssign = template.lastIndexOf('{{ b }}');
      const ctx3 = getTemplateLocalContext(template, bAfterAssign);
      expect(ctx3.assignVars.map((v) => v.name)).toContain('a');
      expect(ctx3.assignVars.map((v) => v.name)).toContain('b');
    });

    it('excludes capture that closes after the variable offset', () => {
      const template = '{{ cap }}{% capture cap %}body{% endcapture %}{{ cap }}';
      const earlyOffset = 0;
      const ctx1 = getTemplateLocalContext(template, earlyOffset);
      expect(ctx1.captureNames).not.toContain('cap');

      const lateOffset = template.lastIndexOf('{{ cap }}');
      const ctx2 = getTemplateLocalContext(template, lateOffset);
      expect(ctx2.captureNames).toContain('cap');
    });

    it('excludes capture when variable is on a preceding line', () => {
      const template = '{{ cap }}\n{% capture cap %}body{% endcapture %}';
      const ctx = getTemplateLocalContext(template, 3);
      expect(ctx.captureNames).not.toContain('cap');
    });

    it('includes capture when variable follows the capture on a later line', () => {
      const template = '{% capture cap %}body{% endcapture %}\n{{ cap }}';
      const varOffset = template.indexOf('{{ cap }}');
      const ctx = getTemplateLocalContext(template, varOffset);
      expect(ctx.captureNames).toContain('cap');
    });
  });

  describe('liquid block tag scoping', () => {
    it('includes assign from liquid block when variable is after the block', () => {
      const template = '{%- liquid\n  assign x = 1\n-%}{{ x }}';
      const varOffset = template.indexOf('{{ x }}');
      const ctx = getTemplateLocalContext(template, varOffset);
      expect(ctx.assignVars.map((a) => a.name)).toContain('x');
    });

    it('excludes assign from liquid block when variable is before the block', () => {
      const template = '{{ x }}{%- liquid\n  assign x = 1\n-%}';
      const varOffset = 0;
      const ctx = getTemplateLocalContext(template, varOffset);
      expect(ctx.assignVars.map((a) => a.name)).not.toContain('x');
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
