/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { PublicTriggerRegistry } from './trigger_registry';
import type { PublicTriggerDefinition } from './types';

const triggerId = 'example.test_trigger';
const eventSchema = z.object({ message: z.string() });
const defaultDefinition: PublicTriggerDefinition<typeof eventSchema> = {
  id: triggerId,
  title: 'Test Trigger',
  description: 'A trigger for testing',
  eventSchema,
};

describe('PublicTriggerRegistry', () => {
  let registry: PublicTriggerRegistry;

  beforeEach(() => {
    registry = new PublicTriggerRegistry();
  });

  describe('register', () => {
    it('should register trigger definition', () => {
      registry.register(defaultDefinition);

      expect(registry.has(triggerId)).toBe(true);
      const retrieved = registry.get(triggerId);
      expect(retrieved).toEqual(defaultDefinition);
    });

    it('should throw an error if definition for the same trigger id is already registered', () => {
      const definition1: PublicTriggerDefinition = {
        ...defaultDefinition,
        title: 'First',
      };
      const definition2: PublicTriggerDefinition = {
        ...defaultDefinition,
        title: 'Second',
      };

      registry.register(definition1);

      expect(() => {
        registry.register(definition2);
      }).toThrow('Trigger definition for "example.test_trigger" is already registered');
    });
  });

  describe('get', () => {
    it('should return definition for a registered trigger', () => {
      registry.register(defaultDefinition);

      const retrieved = registry.get(triggerId);
      expect(retrieved).toEqual(defaultDefinition);
    });

    it('should return undefined for an unregistered trigger', () => {
      const retrieved = registry.get('unknown.trigger');
      expect(retrieved).toBeUndefined();
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
    it('should return empty array when no triggers are registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered trigger definitions', () => {
      const definition2: PublicTriggerDefinition = {
        id: 'other.trigger',
        title: 'Other',
        description: 'Another trigger',
        eventSchema: z.object({ id: z.string() }),
      };
      registry.register(defaultDefinition);
      registry.register(definition2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(defaultDefinition);
      expect(all).toContainEqual(definition2);
    });
  });
});
