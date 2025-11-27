/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSwitchStepSchema, SwitchStepSchema } from './schema';

describe('SwitchStepSchema', () => {
  describe('valid switch steps', () => {
    it('should accept switch step with cases and default', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
        cases: [
          {
            name: 'active',
            match: 'active',
            steps: [{ name: 'active-step', type: 'wait' }],
          },
          {
            name: 'inactive',
            match: 'inactive',
            steps: [{ name: 'inactive-step', type: 'wait' }],
          },
        ],
        default: {
          steps: [{ name: 'default-step', type: 'wait' }],
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('switch');
        expect(result.data.cases).toHaveLength(2);
        expect(result.data.default).toBeDefined();
      }
    });

    it('should accept switch step without default', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
        cases: [
          {
            name: 'active',
            match: 'active',
            steps: [{ name: 'active-step', type: 'wait' }],
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.default).toBeUndefined();
      }
    });

    it('should accept match values of different types', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.value }}',
        cases: [
          {
            name: 'string-case',
            match: 'string-value',
            steps: [{ name: 'step1', type: 'wait' }],
          },
          {
            name: 'number-case',
            match: 42,
            steps: [{ name: 'step2', type: 'wait' }],
          },
          {
            name: 'boolean-case',
            match: true,
            steps: [{ name: 'step3', type: 'wait' }],
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should reject switch step without switch expression', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        cases: [
          {
            name: 'active',
            match: 'active',
            steps: [{ name: 'active-step', type: 'wait' }],
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should reject switch step without cases', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
        cases: [],
      });

      expect(result.success).toBe(false);
    });

    it('should reject switch step with empty case steps', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
        cases: [
          {
            name: 'active',
            match: 'active',
            steps: [],
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should reject switch step with duplicate case names', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
        cases: [
          {
            name: 'active',
            match: 'active',
            steps: [{ name: 'step1', type: 'wait' }],
          },
          {
            name: 'active',
            match: 'inactive',
            steps: [{ name: 'step2', type: 'wait' }],
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.message.includes('unique'))).toBe(true);
      }
    });

    it('should reject switch step with empty case name', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
        cases: [
          {
            name: '',
            match: 'active',
            steps: [{ name: 'step1', type: 'wait' }],
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should reject switch step with empty default steps', () => {
      const result = SwitchStepSchema.safeParse({
        name: 'route-step',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
        cases: [
          {
            name: 'active',
            match: 'active',
            steps: [{ name: 'step1', type: 'wait' }],
          },
        ],
        default: {
          steps: [],
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getSwitchStepSchema with recursive steps', () => {
    it('should accept nested switch steps', () => {
      const schema = getSwitchStepSchema(SwitchStepSchema, false);
      const result = schema.safeParse({
        name: 'outer-switch',
        type: 'switch',
        switch: '{{ steps.getData.output.level }}',
        cases: [
          {
            name: 'level1',
            match: '1',
            steps: [
              {
                name: 'inner-switch',
                type: 'switch',
                switch: '{{ steps.getData.output.status }}',
                cases: [
                  {
                    name: 'active',
                    match: 'active',
                    steps: [{ name: 'nested-step', type: 'wait' }],
                  },
                ],
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });
});
