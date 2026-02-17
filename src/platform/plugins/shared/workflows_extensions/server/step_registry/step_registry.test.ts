/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { ServerStepRegistry } from './step_registry';
import type { ServerStepDefinition } from './types';

const stepId = 'custom.myStep';
const handler = jest.fn();
const defaultDefinition: ServerStepDefinition = {
  id: stepId,
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ name: z.string() }),
  handler,
};

describe('ServerStepRegistry', () => {
  let registry: ServerStepRegistry;

  beforeEach(() => {
    registry = new ServerStepRegistry();
  });

  describe('register', () => {
    it('should register a step definition', () => {
      registry.register(defaultDefinition);

      expect(registry.has(stepId)).toBe(true);
      expect(registry.get(stepId)).toBe(defaultDefinition);
    });

    it('should throw an error if a step with the same ID is already registered', () => {
      registry.register(defaultDefinition);

      expect(() => {
        registry.register(defaultDefinition);
      }).toThrow('Step type "custom.myStep" is already registered');
    });
  });

  describe('get', () => {
    it('should return the handler for a registered step', () => {
      registry.register(defaultDefinition);

      expect(registry.get(stepId)?.handler).toBe(handler);
    });

    it('should return undefined for an unregistered step', () => {
      expect(registry.get('unknown.step')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for a registered step', () => {
      registry.register(defaultDefinition);

      expect(registry.has(stepId)).toBe(true);
    });

    it('should return false for an unregistered step', () => {
      expect(registry.has('unknown.step')).toBe(false);
    });
  });

  describe('getAllStepTypeIds', () => {
    it('should return all registered step type IDs', () => {
      registry.register({ ...defaultDefinition, id: 'custom.step1' });
      registry.register({ ...defaultDefinition, id: 'custom.step2' });
      registry.register({ ...defaultDefinition, id: 'plugin.step3' });

      const allIds = registry.getAll().map((step) => step.id);

      expect(allIds).toHaveLength(3);
      expect(allIds[0]).toBe('custom.step1');
      expect(allIds[1]).toBe('custom.step2');
      expect(allIds[2]).toBe('plugin.step3');
    });

    it('should return an empty array when no steps are registered', () => {
      const allIds = registry.getAll();
      expect(allIds).toEqual([]);
    });
  });
});
