/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateTriggerSnippet } from './generate_trigger_snippet';

describe('generateTriggerSnippet', () => {
  describe('built-in trigger types (alert, manual, scheduled)', () => {
    it('should not include with.condition for alert, manual or scheduled', () => {
      const builtInTypes = ['alert', 'manual', 'scheduled'] as const;
      for (const triggerType of builtInTypes) {
        const snippet = generateTriggerSnippet(triggerType, {
          full: true,
          defaultCondition: 'event.message:*test*',
        });
        expect(snippet).not.toContain('condition:');
      }
    });
  });

  describe('custom triggers with defaultCondition', () => {
    it('should include defaultCondition in the snippet when provided', () => {
      const snippet = generateTriggerSnippet('custom.my_trigger', {
        full: true,
        defaultCondition: 'event.source:ui and event.message:*important*',
      });
      expect(snippet).toContain('condition:');
      expect(snippet).toContain('event.source:ui and event.message:*important*');
    });

    it('should use empty condition when defaultCondition is not provided', () => {
      const snippet = generateTriggerSnippet('custom.my_trigger', { full: true });
      expect(snippet).toContain('condition:');
      expect(snippet).not.toContain('event.source:ui');
    });
  });
});
