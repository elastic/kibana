/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractStepDependencies } from './extract_step_dependencies';

describe('extractStepDependencies', () => {
  describe('static references', () => {
    it('returns the referenced stepId for a direct step output ref', () => {
      expect(extractStepDependencies([{ size: '{{steps.fetch_1.output.data.size}}' }])).toEqual([
        'fetch_1',
      ]);
    });

    it('deduplicates the same stepId referenced multiple times', () => {
      expect(
        extractStepDependencies([
          {
            a: '{{steps.fetch_1.output.x}}',
            b: '{{steps.fetch_1.output.y}}',
          },
        ])
      ).toEqual(['fetch_1']);
    });

    it('collects multiple distinct stepIds from a single with block', () => {
      const result = extractStepDependencies([
        {
          group_1: '{{steps.summarise_group_1.output.sizes}}',
          group_2: '{{steps.summarise_group_2.output.sizes}}',
          group_3: '{{steps.summarise_group_3.output.sizes}}',
          group_4: '{{steps.summarise_group_4.output.sizes}}',
        },
      ]);
      expect(result).not.toBeNull();
      expect(result!.sort()).toEqual(
        ['summarise_group_1', 'summarise_group_2', 'summarise_group_3', 'summarise_group_4'].sort()
      );
    });

    it('collects stepIds across multiple fields passed as separate entries', () => {
      const result = extractStepDependencies([
        '{{steps.step_a.output.value}}',
        { key: '{{steps.step_b.output.key}}' },
      ]);
      expect(result).not.toBeNull();
      expect(result!.sort()).toEqual(['step_a', 'step_b']);
    });

    it('returns empty array when no step references are present', () => {
      expect(extractStepDependencies([{ url: 'http://example.com', method: 'GET' }])).toEqual([]);
    });

    it('returns empty array for a plain string with no template syntax', () => {
      expect(extractStepDependencies(['hello world'])).toEqual([]);
    });

    it('returns empty array for an empty fields array', () => {
      expect(extractStepDependencies([])).toEqual([]);
    });

    it('returns empty array for null/undefined field values', () => {
      expect(extractStepDependencies([null, undefined])).toEqual([]);
    });

    it('handles deeply nested with objects', () => {
      const result = extractStepDependencies([
        { nested: { deep: '{{steps.deep_step.output.value}}' } },
      ]);
      expect(result).toEqual(['deep_step']);
    });

    it('handles array values inside with', () => {
      const result = extractStepDependencies([
        ['{{steps.step_a.output.x}}', '{{steps.step_b.output.y}}'],
      ]);
      expect(result).not.toBeNull();
      expect(result!.sort()).toEqual(['step_a', 'step_b']);
    });

    it('does not collect non-steps top-level references (e.g. variables, consts)', () => {
      const result = extractStepDependencies([
        {
          fromVar: '{{variables.myVar}}',
          fromConst: '{{consts.baseUrl}}',
          fromStep: '{{steps.fetch_1.output.data}}',
        },
      ]);
      expect(result).toEqual(['fetch_1']);
    });

    it('handles the ${{ prefix normalization', () => {
      expect(extractStepDependencies(['${{steps.fetch_1.output.value}}'])).toEqual(['fetch_1']);
    });
  });

  describe('dynamic references — return null', () => {
    it('returns null for a dynamic bracket step reference', () => {
      expect(extractStepDependencies(['{{steps[myVar].output}}'])).toBeNull();
    });

    it('returns null when a dynamic ref is mixed with static refs', () => {
      expect(
        extractStepDependencies([
          { a: '{{steps.fetch_1.output.x}}', b: '{{steps[dynamicStep].output}}' },
        ])
      ).toBeNull();
    });

    it('returns null when dynamic ref appears in a nested object', () => {
      expect(
        extractStepDependencies([{ outer: { inner: '{{steps[variable].output}}' } }])
      ).toBeNull();
    });

    it('returns null for a dynamic ref in a separate field entry', () => {
      expect(
        extractStepDependencies(['{{steps.step_a.output}}', '{{steps[dynStep].output}}'])
      ).toBeNull();
    });
  });

  describe('child step array exclusion (caller responsibility)', () => {
    // The utility trusts the caller to pass only the allowlisted fields.
    // These tests document that the caller must NOT pass child step arrays.
    it('would incorrectly pick up child step refs if passed directly (caller must exclude)', () => {
      // This test documents the expected behavior if a caller incorrectly passes
      // a nested step array — the utility would find those refs. Callers must
      // use the allowlist and strip child step arrays before calling.
      const childSteps = [{ with: { url: '{{steps.parent.output.baseUrl}}' } }];
      const result = extractStepDependencies([childSteps]);
      // The utility correctly finds 'parent' — but this would be WRONG for the
      // enter-foreach node since 'parent' belongs to the inner step, not foreach.
      // The caller must not pass foreach.steps here.
      expect(result).toEqual(['parent']);
    });
  });
});
