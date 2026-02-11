/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { PublicStepRegistry } from './step_registry';
import type { PublicStepDefinition } from './types';

const stepId = 'custom.myStep';
const defaultDefinition: PublicStepDefinition = {
  id: stepId,
  label: 'My Custom Step',
  description: 'A custom step implementation',
  icon: jest.fn(),
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ name: z.string() }),
};

describe('PublicStepRegistry', () => {
  let registry: PublicStepRegistry;

  beforeEach(() => {
    registry = new PublicStepRegistry();
  });

  describe('register', () => {
    it('should register step definition', () => {
      registry.register(defaultDefinition);

      expect(registry.has(stepId)).toBe(true);
      const retrieved = registry.get(stepId);
      expect(retrieved).toEqual(defaultDefinition);
    });

    it('should throw an error if definition for the same step type ID is already registered', () => {
      const definition1: PublicStepDefinition = {
        ...defaultDefinition,
        label: 'First',
      };
      const definition2: PublicStepDefinition = {
        ...defaultDefinition,
        label: 'Second',
      };

      registry.register(definition1);

      expect(() => {
        registry.register(definition2);
      }).toThrow('Step definition for type "custom.myStep" is already registered');
    });
  });

  describe('get', () => {
    it('should return definition for a registered step', () => {
      registry.register(defaultDefinition);

      const retrieved = registry.get(stepId);

      expect(retrieved).toEqual(defaultDefinition);
    });

    it('should return undefined for an unregistered step', () => {
      const definition = registry.get('unknown.step');
      expect(definition).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for a registered step', () => {
      registry.register(defaultDefinition);

      expect(registry.has(defaultDefinition.id)).toBe(true);
    });

    it('should return false for an unregistered step', () => {
      expect(registry.has('unknown.step')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered step definition', () => {
      const definition1: PublicStepDefinition = {
        ...defaultDefinition,
        id: 'custom.step1',
      };
      const definition2: PublicStepDefinition = {
        ...defaultDefinition,
        id: 'custom.step2',
      };

      registry.register(definition1);
      registry.register(definition2);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContainEqual(definition1);
      expect(all).toContainEqual(definition2);
    });

    it('should return an empty array when no definition is registered', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });
});
