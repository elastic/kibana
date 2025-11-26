/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ServerStepRegistry } from './step_registry';
import { createStepTypeId } from '../../common';
import type { ServerStepDefinition } from '../types';

describe('ServerStepRegistry', () => {
  let registry: ServerStepRegistry;

  beforeEach(() => {
    registry = new ServerStepRegistry();
  });

  describe('register', () => {
    it('should register a step definition', () => {
      const stepId = createStepTypeId('custom.myStep');
      const factory = jest.fn();
      const definition: ServerStepDefinition = {
        id: stepId,
        factory,
      };

      registry.register(definition);

      expect(registry.has(String(stepId))).toBe(true);
      expect(registry.get(String(stepId))).toBe(factory);
    });

    it('should throw an error if a step with the same ID is already registered', () => {
      const stepId = createStepTypeId('custom.myStep');
      const factory1 = jest.fn();
      const factory2 = jest.fn();

      registry.register({ id: stepId, factory: factory1 });

      expect(() => {
        registry.register({ id: stepId, factory: factory2 });
      }).toThrow('Step type "custom.myStep" is already registered');
    });
  });

  describe('get', () => {
    it('should return the factory for a registered step', () => {
      const stepId = createStepTypeId('custom.myStep');
      const factory = jest.fn();
      registry.register({ id: stepId, factory });

      const retrievedFactory = registry.get(String(stepId));

      expect(retrievedFactory).toBe(factory);
    });

    it('should return undefined for an unregistered step', () => {
      const factory = registry.get('unknown.step');
      expect(factory).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for a registered step', () => {
      const stepId = createStepTypeId('custom.myStep');
      registry.register({ id: stepId, factory: jest.fn() });

      expect(registry.has(String(stepId))).toBe(true);
    });

    it('should return false for an unregistered step', () => {
      expect(registry.has('unknown.step')).toBe(false);
    });
  });

  describe('getAllStepTypeIds', () => {
    it('should return all registered step type IDs', () => {
      registry.register({ id: createStepTypeId('custom.step1'), factory: jest.fn() });
      registry.register({ id: createStepTypeId('custom.step2'), factory: jest.fn() });
      registry.register({ id: createStepTypeId('plugin.step3'), factory: jest.fn() });

      const allIds = registry.getAllStepTypeIds();

      expect(allIds).toHaveLength(3);
      expect(allIds).toContain('custom.step1');
      expect(allIds).toContain('custom.step2');
      expect(allIds).toContain('plugin.step3');
    });

    it('should return an empty array when no steps are registered', () => {
      const allIds = registry.getAllStepTypeIds();
      expect(allIds).toEqual([]);
    });
  });
});
