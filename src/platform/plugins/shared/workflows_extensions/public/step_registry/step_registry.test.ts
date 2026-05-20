/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { PublicStepRegistry } from './step_registry';
import type { PublicStepDefinition } from './types';

const stepId = 'custom.myStep';
const defaultDefinition: PublicStepDefinition = {
  id: stepId,
  category: StepCategory.Kibana,
  label: 'My Custom Step',
  description: 'A custom step implementation',
  icon: jest.fn(),
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ name: z.string() }),
};

describe('PublicStepRegistry', () => {
  let registry: PublicStepRegistry;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    registry = new PublicStepRegistry(logger);
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

  describe('register with async loader', () => {
    it('should resolve loader and add definition to registry', async () => {
      registry.register(() => Promise.resolve(defaultDefinition));

      expect(registry.has(stepId)).toBe(false);
      await registry.whenReady();
      expect(registry.has(stepId)).toBe(true);
      expect(registry.get(stepId)).toEqual(defaultDefinition);
    });

    it('should not resolve loader until whenReady is called', async () => {
      const mockLoader = jest.fn().mockResolvedValue(defaultDefinition);
      registry.register(mockLoader);

      expect(registry.has(stepId)).toBe(false);
      expect(mockLoader).not.toHaveBeenCalled();

      await registry.whenReady();
      expect(registry.has(stepId)).toBe(true);
      expect(mockLoader).toHaveBeenCalled();
    });

    it('should log an error and skip registration when resolved definition duplicates an existing step type ID', async () => {
      registry.register(defaultDefinition);
      const loader = () => Promise.resolve({ ...defaultDefinition, label: 'Other' });

      registry.register(loader);

      await expect(registry.whenReady()).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to register step definition',
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining(
              'Step definition for type "custom.myStep" is already registered'
            ),
          }),
        })
      );
      expect(registry.get(stepId)).toEqual(defaultDefinition);
    });

    it('whenReady() should resolve after all loaders have settled', async () => {
      const def1: PublicStepDefinition = { ...defaultDefinition, id: 'custom.step1' };
      const def2: PublicStepDefinition = { ...defaultDefinition, id: 'custom.step2' };
      let resolve1!: (d: PublicStepDefinition) => void;
      let resolve2!: (d: PublicStepDefinition) => void;
      const promise1 = new Promise<PublicStepDefinition>((r) => {
        resolve1 = r;
      });
      const promise2 = new Promise<PublicStepDefinition>((r) => {
        resolve2 = r;
      });

      registry.register(() => promise1);
      registry.register(() => promise2);

      const readyPromise = registry.whenReady();
      expect(registry.getAll()).toHaveLength(0);

      resolve1(def1);
      await Promise.resolve();
      expect(registry.getAll()).toHaveLength(1);

      resolve2(def2);
      await readyPromise;
      expect(registry.getAll()).toHaveLength(2);
    });

    it('should support mixed sync and async registration', async () => {
      const syncDef: PublicStepDefinition = { ...defaultDefinition, id: 'custom.sync' };
      const asyncDef: PublicStepDefinition = { ...defaultDefinition, id: 'custom.async' };

      registry.register(syncDef);
      registry.register(() => Promise.resolve(asyncDef));

      expect(registry.has('custom.sync')).toBe(true);
      expect(registry.has('custom.async')).toBe(false);

      await registry.whenReady();

      expect(registry.get('custom.sync')).toEqual(syncDef);
      expect(registry.get('custom.async')).toEqual(asyncDef);
      expect(registry.getAll()).toHaveLength(2);
    });

    it('should skip registration when loader resolves with undefined', async () => {
      registry.register(() => Promise.resolve(undefined));

      await registry.whenReady();

      expect(registry.has(stepId)).toBe(false);
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should skip registration when loader resolves with null', async () => {
      registry.register(() => Promise.resolve(null as unknown as PublicStepDefinition));

      await registry.whenReady();

      expect(registry.has(stepId)).toBe(false);
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should log an error and resolve whenReady() when loader rejects', async () => {
      const loadError = new Error('Failed to load step module');
      registry.register(() => Promise.reject(loadError));

      await expect(registry.whenReady()).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith('Failed to register step definition', {
        error: loadError,
      });
    });
  });

  describe('whenReady', () => {
    it('should resolve immediately when no pending loaders', async () => {
      registry.register(defaultDefinition);
      await expect(registry.whenReady()).resolves.toBeUndefined();
    });
  });
});
