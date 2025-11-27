/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateBuiltInStepSnippet } from './generate_builtin_step_snippet';

describe('generateBuiltInStepSnippet', () => {
  describe('switch step', () => {
    it('should generate switch snippet with cases and default', () => {
      const snippet = generateBuiltInStepSnippet('switch', { full: false });
      expect(snippet).toContain('switch');
      expect(snippet).toContain('cases');
      expect(snippet).toContain('default');
      expect(snippet).toContain('case-1');
      expect(snippet).toContain('case-2');
      expect(snippet).toContain('match');
      expect(snippet).toContain('{{ steps.step_1.output.status }}');
    });

    it('should generate full switch snippet with steps section', () => {
      const snippet = generateBuiltInStepSnippet('switch', {
        full: true,
        withStepsSection: true,
      });
      expect(snippet).toContain('steps:');
      expect(snippet).toContain('- name: switch_step');
      expect(snippet).toContain('type: switch');
      expect(snippet).toContain('switch:');
      expect(snippet).toContain('cases:');
      expect(snippet).toContain('default:');
    });

    it('should generate full switch snippet without steps section', () => {
      const snippet = generateBuiltInStepSnippet('switch', {
        full: true,
        withStepsSection: false,
      });
      // Should not have top-level "steps:" section, but "steps:" within cases/default is expected
      expect(snippet).not.toMatch(/^steps:/m);
      expect(snippet).toContain('- name: switch_step');
      expect(snippet).toContain('type: switch');
      // But should have steps within cases and default
      expect(snippet).toContain('cases:');
      expect(snippet).toContain('default:');
    });

    it('should include match values in cases', () => {
      const snippet = generateBuiltInStepSnippet('switch', { full: false });
      expect(snippet).toContain('match:');
      expect(snippet).toContain('active');
      expect(snippet).toContain('inactive');
    });
  });
});
