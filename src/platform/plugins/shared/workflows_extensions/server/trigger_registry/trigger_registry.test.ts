/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { ServerTriggerRegistry } from './trigger_registry';
import type { ServerTriggerDefinition, TriggerEventData, TriggerMatchResult } from './types';

const triggerId = 'streams.upsertStream';
const mockMatcher = jest.fn(
  (_config: unknown, _event: TriggerEventData): TriggerMatchResult => ({
    matches: true,
    workflowInputs: {},
  })
);
const defaultDefinition: ServerTriggerDefinition = {
  id: triggerId,
  configSchema: z.object({ stream: z.string(), changeTypes: z.array(z.string()).optional() }),
  matches: mockMatcher,
};

describe('ServerTriggerRegistry', () => {
  let registry: ServerTriggerRegistry;

  beforeEach(() => {
    registry = new ServerTriggerRegistry();
  });

  describe('register', () => {
    it('should register a trigger definition', () => {
      registry.register(defaultDefinition);

      expect(registry.has(triggerId)).toBe(true);
      expect(registry.get(triggerId)).toBe(defaultDefinition);
    });

    it('should throw an error if a trigger with the same ID is already registered', () => {
      registry.register(defaultDefinition);

      expect(() => {
        registry.register(defaultDefinition);
      }).toThrow('Trigger type "streams.upsertStream" is already registered');
    });
  });

  describe('get', () => {
    it('should return the definition for a registered trigger', () => {
      registry.register(defaultDefinition);

      expect(registry.get(triggerId)).toBe(defaultDefinition);
    });

    it('should return undefined for an unregistered trigger', () => {
      expect(registry.get('unknown.trigger')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for a registered trigger', () => {
      registry.register(defaultDefinition);

      expect(registry.has(triggerId)).toBe(true);
    });

    it('should return false for an unregistered trigger', () => {
      expect(registry.has('unknown.trigger')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered trigger definitions', () => {
      registry.register({ ...defaultDefinition, id: 'streams.trigger1' });
      registry.register({ ...defaultDefinition, id: 'streams.trigger2' });
      registry.register({ ...defaultDefinition, id: 'custom.trigger3' });

      const allTriggers = registry.getAll();
      const allIds = allTriggers.map((trigger) => trigger.id);

      expect(allIds).toHaveLength(3);
      expect(allIds[0]).toBe('streams.trigger1');
      expect(allIds[1]).toBe('streams.trigger2');
      expect(allIds[2]).toBe('custom.trigger3');
    });

    it('should return an empty array when no triggers are registered', () => {
      const allTriggers = registry.getAll();
      expect(allTriggers).toEqual([]);
    });
  });

  describe('trigger matcher', () => {
    it('should allow invoking the matches function on a registered trigger', () => {
      registry.register(defaultDefinition);

      const trigger = registry.get(triggerId);
      expect(trigger).toBeDefined();

      const eventData: TriggerEventData = {
        type: triggerId,
        payload: { streamName: 'logs-test', changeTypes: ['mapping'] },
      };

      const result = trigger!.matches({ stream: 'logs-*' }, eventData);
      expect(mockMatcher).toHaveBeenCalledWith({ stream: 'logs-*' }, eventData);
      expect(result.matches).toBe(true);
    });
  });
});
