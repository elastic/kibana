/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicStepRegistry } from './step_registry';
import { createStepTypeId } from '../../common';
import type { StepMetadata } from '../types';

describe('PublicStepRegistry', () => {
  let registry: PublicStepRegistry;

  beforeEach(() => {
    registry = new PublicStepRegistry();
  });

  describe('register', () => {
    it('should register step metadata', () => {
      const stepId = createStepTypeId('custom.myStep');
      const metadata: StepMetadata = {
        id: stepId,
        label: 'My Custom Step',
        description: 'A custom step implementation',
        icon: 'star',
      };

      registry.register(metadata);

      expect(registry.has(String(stepId))).toBe(true);
      const retrieved = registry.get(String(stepId));
      expect(retrieved).toEqual(metadata);
    });

    it('should throw an error if metadata for the same step type ID is already registered', () => {
      const stepId = createStepTypeId('custom.myStep');
      const metadata1: StepMetadata = {
        id: stepId,
        label: 'First',
        icon: 'star',
      };
      const metadata2: StepMetadata = {
        id: stepId,
        label: 'Second',
        icon: 'heart',
      };

      registry.register(metadata1);

      expect(() => {
        registry.register(metadata2);
      }).toThrow('Step metadata for type "custom.myStep" is already registered');
    });
  });

  describe('get', () => {
    it('should return metadata for a registered step', () => {
      const stepId = createStepTypeId('custom.myStep');
      const metadata: StepMetadata = {
        id: stepId,
        label: 'My Custom Step',
        description: 'A custom step',
        icon: 'star',
      };
      registry.register(metadata);

      const retrieved = registry.get(String(stepId));

      expect(retrieved).toEqual(metadata);
    });

    it('should return undefined for an unregistered step', () => {
      const metadata = registry.get('unknown.step');
      expect(metadata).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for a registered step', () => {
      const stepId = createStepTypeId('custom.myStep');
      registry.register({
        id: stepId,
        label: 'Test',
        icon: 'star',
      });

      expect(registry.has(String(stepId))).toBe(true);
    });

    it('should return false for an unregistered step', () => {
      expect(registry.has('unknown.step')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered step metadata', () => {
      const metadata1: StepMetadata = {
        id: createStepTypeId('custom.step1'),
        label: 'Step 1',
        icon: 'star',
      };
      const metadata2: StepMetadata = {
        id: createStepTypeId('custom.step2'),
        label: 'Step 2',
        description: 'Description',
        icon: 'heart',
      };

      registry.register(metadata1);
      registry.register(metadata2);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContainEqual(metadata1);
      expect(all).toContainEqual(metadata2);
    });

    it('should return an empty array when no metadata is registered', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });
});
