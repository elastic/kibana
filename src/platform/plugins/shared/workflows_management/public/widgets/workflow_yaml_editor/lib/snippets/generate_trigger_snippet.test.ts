/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTriggerSchema } from '@kbn/workflows';
import { generateTriggerSnippet } from './generate_trigger_snippet';

describe('generateTriggerSnippet', () => {
  describe('built-in trigger types (alert, manual, scheduled)', () => {
    it('should not include on.condition for alert, manual or scheduled', () => {
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

  describe('requiresConnectorId', () => {
    const connectorEventTriggerId = 'example.connector_event';

    it('should include connector-id for connector-event triggers', () => {
      const snippet = generateTriggerSnippet(connectorEventTriggerId, {
        full: true,
        requiresConnectorId: true,
      });
      expect(snippet).toContain(`type: ${connectorEventTriggerId}`);
      expect(snippet).toContain('connector-id: ""');
      expect(snippet).toContain('Id of the connector instance this trigger is bound to');
      expect(snippet).toMatch(
        /# Id of the connector instance this trigger is bound to\n\s+connector-id:/
      );
      expect(snippet).not.toMatch(/# Id of the connector instance this trigger is bound to\n\n/);
      expect(snippet).toContain('condition:');
      const schema = getTriggerSchema([{ id: connectorEventTriggerId, requiresConnectorId: true }]);
      expect(schema.safeParse({ type: connectorEventTriggerId, 'connector-id': '' }).success).toBe(
        false
      );
    });

    it('should not include connector-id for other custom triggers', () => {
      const snippet = generateTriggerSnippet('cases.updated', { full: true });
      expect(snippet).not.toContain('connector-id:');
    });

    it('should not include connector-id for built-in triggers even if the flag is set', () => {
      const snippet = generateTriggerSnippet('manual', {
        full: true,
        requiresConnectorId: true,
      });
      expect(snippet).not.toContain('connector-id:');
    });
  });
});
