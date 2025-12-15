/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CollisionStrategy } from './schema';
import {
  CollisionStrategySchema,
  WorkflowSchemaForAutocomplete,
  WorkflowSettingsSchema,
} from './schema';

describe('WorkflowSchemaForAutocomplete', () => {
  it('should allow empty "with" block', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        name: 'test',
        steps: [
          {
            name: 'step1',
            type: 'console',
            with: {},
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      name: 'test',
      enabled: true,
      triggers: [],
      steps: [
        {
          name: 'step1',
          type: 'console',
          with: {},
        },
      ],
    });
  });

  it('should allow steps with just type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: [
          {
            type: 'console',
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [],
      steps: [
        {
          name: '',
          type: 'console',
        },
      ],
    });
  });

  it('should allow triggers with just type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        triggers: [
          {
            type: 'manual',
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [
        {
          type: 'manual',
        },
      ],
      steps: [],
    });
  });

  it('should catch null type for steps and triggers and return empty string for name and type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: [
          {
            type: null,
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [],
      steps: [
        {
          name: '',
          type: '',
        },
      ],
    });
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        triggers: [
          {
            type: null,
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [
        {
          type: '',
        },
      ],
      steps: [],
    });
  });

  it('should catch non-array steps and triggers and return empty array for steps and triggers', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: 'console',
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      steps: [],
      triggers: [],
    });
  });
});

describe('WorkflowSettingsSchema', () => {
  describe('concurrency-key', () => {
    it('should accept valid concurrency-key string', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'concurrency-key': 'server-1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['concurrency-key']).toBe('server-1');
      }
    });

    it('should accept template expression concurrency-key', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'concurrency-key': '{{ event.host.name }}',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['concurrency-key']).toBe('{{ event.host.name }}');
      }
    });

    it('should accept empty concurrency-key', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'concurrency-key': '',
      });
      expect(result.success).toBe(true);
    });

    it('should allow concurrency-key to be optional', () => {
      const result = WorkflowSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['concurrency-key']).toBeUndefined();
      }
    });
  });

  describe('collision-strategy', () => {
    it('should accept valid collision-strategy values', () => {
      const strategies = ['queue', 'drop', 'cancel-in-progress'] as const;
      strategies.forEach((strategy) => {
        const result = WorkflowSettingsSchema.safeParse({
          'collision-strategy': strategy,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data['collision-strategy']).toBe(strategy);
        }
      });
    });

    it('should reject invalid collision-strategy values', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'collision-strategy': 'invalid-strategy',
      });
      expect(result.success).toBe(false);
    });

    it('should allow collision-strategy to be omitted', () => {
      const result = WorkflowSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['collision-strategy']).toBeUndefined();
      }
    });
  });

  describe('max-concurrency-per-group', () => {
    it('should accept valid positive integer values', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'max-concurrency-per-group': 5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['max-concurrency-per-group']).toBe(5);
      }
    });

    it('should accept minimum value of 1', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'max-concurrency-per-group': 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['max-concurrency-per-group']).toBe(1);
      }
    });

    it('should reject values less than 1', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'max-concurrency-per-group': 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative values', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'max-concurrency-per-group': -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer values', () => {
      const result = WorkflowSettingsSchema.safeParse({
        'max-concurrency-per-group': 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should allow max-concurrency-per-group to be omitted', () => {
      const result = WorkflowSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['max-concurrency-per-group']).toBeUndefined();
      }
    });
  });

  describe('CollisionStrategySchema', () => {
    it('should accept all valid strategy values', () => {
      expect(CollisionStrategySchema.safeParse('queue').success).toBe(true);
      expect(CollisionStrategySchema.safeParse('drop').success).toBe(true);
      expect(CollisionStrategySchema.safeParse('cancel-in-progress').success).toBe(true);
    });

    it('should reject invalid strategy values', () => {
      expect(CollisionStrategySchema.safeParse('invalid').success).toBe(false);
      expect(CollisionStrategySchema.safeParse('').success).toBe(false);
      expect(CollisionStrategySchema.safeParse(null).success).toBe(false);
    });

    it('should export CollisionStrategy type that matches valid values', () => {
      // Verify the type can be used and matches the schema values
      const validStrategies: CollisionStrategy[] = ['queue', 'drop', 'cancel-in-progress'];
      validStrategies.forEach((strategy) => {
        const result = CollisionStrategySchema.safeParse(strategy);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(strategy);
        }
      });
    });
  });
});
